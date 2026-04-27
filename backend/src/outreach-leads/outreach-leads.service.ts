import { Injectable, NotFoundException } from '@nestjs/common';
import {
  ActivityType,
  LeadPriority,
  LeadStatus,
  MessageType,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { buildLeadDedupeKey } from './dedupe/lead-dedupe.util';
import { CreateLeadDto } from './dto/create-lead.dto';
import { ImportLeadsDto, type ImportLeadItemDto } from './dto/import-leads.dto';
import { CreateMessageDto } from './dto/create-message.dto';
import { CreateNoteDto } from './dto/create-note.dto';
import { GenerateMessageDto } from './dto/generate-message.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';
import { OutreachGenerationService } from './outreach-generation.service';

@Injectable()
export class OutreachLeadsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly outreachGeneration: OutreachGenerationService,
  ) {}

  async create(dto: CreateLeadDto) {
    const {
      businessName,
      serviceType,
      area,
      phone,
      email,
      website,
      source,
      sourceUrl,
      rating,
      reviewCount,
      status,
      priority,
      nextAction,
      lastContactedAt,
      nextFollowUpAt,
    } = dto;

    return this.prisma.outreachLead.create({
      data: {
        businessName: businessName.trim(),
        serviceType: serviceType.trim(),
        area: area.trim(),
        phone: this.normalizePhone(phone),
        email: this.normalizeEmail(email),
        website: this.normalizeWebsite(website),
        source: source.trim(),
        sourceUrl: this.normalizeWebsite(sourceUrl),
        rating,
        reviewCount,
        dedupeKey: buildLeadDedupeKey({
          businessName,
          area,
          source,
          phone,
          email,
          website,
          sourceUrl,
        }),
        ...(status !== undefined && { status }),
        ...(priority !== undefined && { priority }),
        nextAction,
        lastContactedAt,
        nextFollowUpAt,
        activities: {
          create: { type: ActivityType.CREATED },
        },
      },
    });
  }

  async importLeads(dto: ImportLeadsDto) {
    const normalized = dto.leads.map((lead) => this.normalizeImportLead(lead));
    const validLeads = normalized.filter((lead) => lead.isValid);
    const createManyData: Prisma.OutreachLeadCreateManyInput[] = validLeads.map(
      ({ isValid: _isValid, ...lead }) => lead,
    );

    if (createManyData.length === 0) {
      return {
        received: dto.leads.length,
        inserted: 0,
        skippedDuplicate: 0,
        invalid: dto.leads.length,
      };
    }

    const result = await this.prisma.outreachLead.createMany({
      data: createManyData,
      skipDuplicates: true,
    });
    const invalidCount = dto.leads.length - createManyData.length;
    const skippedDuplicate =
      dto.leads.length - invalidCount - (result.count ?? 0);

    return {
      received: dto.leads.length,
      inserted: result.count,
      skippedDuplicate: Math.max(0, skippedDuplicate),
      invalid: invalidCount,
    };
  }

  /** List leads: exact match on filters; newest first. */
  async findAll(filters: {
    status?: LeadStatus;
    area?: string;
    serviceType?: string;
  }) {
    const where: Prisma.OutreachLeadWhereInput = {};

    if (filters.status) {
      where.status = filters.status;
    }
    if (filters.area) {
      where.area = filters.area;
    }
    if (filters.serviceType) {
      where.serviceType = filters.serviceType;
    }

    return this.prisma.outreachLead.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  async getDueFollowUps(includeFuture = false) {
    const now = new Date();

    return this.prisma.outreachLead.findMany({
      where: {
        status: { not: LeadStatus.NOT_INTERESTED },
        nextFollowUpAt: includeFuture ? { not: null } : { lte: now },
      },
      orderBy: { nextFollowUpAt: 'asc' },
    });
  }

  async findOne(id: string) {
    const lead = await this.prisma.outreachLead.findUnique({
      where: { id },
      include: {
        notes: { orderBy: { createdAt: 'desc' } },
        messages: { orderBy: { createdAt: 'desc' } },
        activities: { orderBy: { createdAt: 'desc' } },
      },
    });

    if (!lead) {
      throw new NotFoundException(`Lead with id "${id}" not found`);
    }

    return lead;
  }

  async update(id: string, dto: UpdateLeadDto) {
    const data: Prisma.OutreachLeadUpdateInput = {};

    if (dto.businessName !== undefined) data.businessName = dto.businessName;
    if (dto.serviceType !== undefined) data.serviceType = dto.serviceType;
    if (dto.area !== undefined) data.area = dto.area;
    if (dto.phone !== undefined) data.phone = dto.phone;
    if (dto.email !== undefined) data.email = dto.email;
    if (dto.website !== undefined) data.website = dto.website;
    if (dto.source !== undefined) data.source = dto.source;
    if (dto.sourceUrl !== undefined) data.sourceUrl = dto.sourceUrl;
    if (dto.rating !== undefined) data.rating = dto.rating;
    if (dto.reviewCount !== undefined) data.reviewCount = dto.reviewCount;
    if (dto.status !== undefined) data.status = dto.status;
    if (dto.priority !== undefined) data.priority = dto.priority;
    if (dto.nextAction !== undefined) data.nextAction = dto.nextAction;
    if (dto.lastContactedAt !== undefined) {
      data.lastContactedAt = dto.lastContactedAt;
    }
    if (dto.nextFollowUpAt !== undefined) {
      data.nextFollowUpAt = dto.nextFollowUpAt;
    }

    return this.updateLeadStatus({
      leadId: id,
      data,
      activity:
        dto.status !== undefined
          ? {
              type: ActivityType.STATUS_CHANGED,
              metadata: (previousStatus) => ({
                previousStatus,
                newStatus: dto.status,
              }),
            }
          : undefined,
    });
  }

  async markContacted(id: string) {
    return this.updateLeadStatus({
      leadId: id,
      data: {
        status: LeadStatus.CONTACTED,
        lastContactedAt: new Date(),
        nextAction: 'Waiting for reply',
      },
      activity: {
        type: ActivityType.CONTACTED,
        metadata: () => ({ contactedAt: new Date().toISOString() }),
      },
    });
  }

  async markReplied(id: string) {
    return this.updateLeadStatus({
      leadId: id,
      data: {
        status: LeadStatus.REPLIED,
        nextAction: 'Review reply',
      },
      activity: {
        type: ActivityType.REPLIED,
        metadata: (previousStatus) => ({
          previousStatus,
          newStatus: LeadStatus.REPLIED,
        }),
      },
    });
  }

  async markInterested(id: string) {
    return this.updateLeadStatus({
      leadId: id,
      data: {
        status: LeadStatus.INTERESTED,
        nextAction: 'Follow up / onboard',
      },
      activity: {
        type: ActivityType.STATUS_CHANGED,
        metadata: (previousStatus) => ({
          previousStatus,
          newStatus: LeadStatus.INTERESTED,
        }),
      },
    });
  }

  async markNotInterested(id: string) {
    return this.updateLeadStatus({
      leadId: id,
      data: {
        status: LeadStatus.NOT_INTERESTED,
        nextAction: null,
        nextFollowUpAt: null,
      },
      activity: {
        type: ActivityType.STATUS_CHANGED,
        metadata: (previousStatus) => ({
          previousStatus,
          newStatus: LeadStatus.NOT_INTERESTED,
        }),
      },
    });
  }

  async scheduleFollowUp(id: string, nextFollowUpAt: Date) {
    const formattedDate = this.formatFollowUpDate(nextFollowUpAt);

    return this.updateLeadStatus({
      leadId: id,
      data: {
        nextFollowUpAt,
        nextAction: `Follow up on ${formattedDate}`,
      },
      activity: {
        type: ActivityType.FOLLOW_UP_SCHEDULED,
        metadata: () => ({
          nextFollowUpAt: nextFollowUpAt.toISOString(),
        }),
      },
      logWithoutStatusChange: true,
    });
  }

  async addNote(leadId: string, dto: CreateNoteDto) {
    await this.ensureLeadExists(leadId);

    return this.prisma.$transaction(async (tx) => {
      const note = await tx.outreachNote.create({
        data: {
          leadId,
          content: dto.content,
        },
      });

      await tx.leadActivity.create({
        data: {
          leadId,
          type: ActivityType.NOTE_ADDED,
          metadata: { noteId: note.id },
        },
      });

      return note;
    });
  }

  /** v1: no LeadActivity row for outbound messages. */
  async addMessage(leadId: string, dto: CreateMessageDto) {
    await this.ensureLeadExists(leadId);

    return this.prisma.outreachMessage.create({
      data: {
        leadId,
        type: dto.type,
        content: dto.content,
      },
    });
  }

  async generateMessage(leadId: string, dto: GenerateMessageDto) {
    const lead = await this.prisma.outreachLead.findUnique({
      where: { id: leadId },
      select: {
        businessName: true,
        serviceType: true,
        area: true,
        rating: true,
        reviewCount: true,
        source: true,
        website: true,
      },
    });

    if (!lead) {
      throw new NotFoundException(`Lead with id "${leadId}" not found`);
    }

    const content = await this.outreachGeneration.generateMessage(
      lead,
      dto.tone,
      dto.instruction,
    );

    return this.prisma.outreachMessage.create({
      data: {
        leadId,
        type: MessageType.INITIAL,
        content,
      },
    });
  }

  async generateFollowUpMessage(leadId: string, dto: GenerateMessageDto) {
    const lead = await this.prisma.outreachLead.findUnique({
      where: { id: leadId },
      include: {
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 5,
          select: { content: true, type: true },
        },
        activities: {
          orderBy: { createdAt: 'desc' },
          take: 5,
          select: { type: true, metadata: true },
        },
      },
    });

    if (!lead) {
      throw new NotFoundException(`Lead with id "${leadId}" not found`);
    }

    const activityHints = lead.activities
      .map((activity) => activity.type)
      .slice(0, 3)
      .join(', ');
    const composedInstruction = [
      dto.instruction?.trim(),
      activityHints ? `Recent activities: ${activityHints}.` : '',
    ]
      .filter(Boolean)
      .join(' ');

    const content = await this.outreachGeneration.generateFollowUpMessage(
      {
        businessName: lead.businessName,
        serviceType: lead.serviceType,
        area: lead.area,
        rating: lead.rating,
        reviewCount: lead.reviewCount,
        source: lead.source,
        website: lead.website,
      },
      lead.messages,
      dto.tone,
      composedInstruction || undefined,
    );

    return this.prisma.$transaction(async (tx) => {
      const message = await tx.outreachMessage.create({
        data: {
          leadId,
          type: MessageType.FOLLOW_UP,
          content,
        },
      });

      await this.logActivity(tx, {
        leadId,
        type: ActivityType.FOLLOW_UP_MESSAGE_CREATED,
        metadata: {
          tone: dto.tone,
          messageId: message.id,
        },
      });

      return message;
    });
  }

  private async ensureLeadExists(id: string) {
    const lead = await this.prisma.outreachLead.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!lead) {
      throw new NotFoundException(`Lead with id "${id}" not found`);
    }
  }

  private async updateLeadStatus(params: {
    leadId: string;
    data: Prisma.OutreachLeadUpdateInput;
    activity?: {
      type: ActivityType;
      metadata: (previousStatus: LeadStatus) => Prisma.InputJsonValue;
    };
    logWithoutStatusChange?: boolean;
  }) {
    const existing = await this.prisma.outreachLead.findUnique({
      where: { id: params.leadId },
      select: { id: true, status: true },
    });

    if (!existing) {
      throw new NotFoundException(`Lead with id "${params.leadId}" not found`);
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.outreachLead.update({
        where: { id: params.leadId },
        data: params.data,
      });

      const requestedStatus = this.extractRequestedStatus(params.data.status);
      const statusChanged =
        requestedStatus === undefined || requestedStatus !== existing.status;

      if (params.activity && (statusChanged || params.logWithoutStatusChange)) {
        await this.logActivity(tx, {
          leadId: params.leadId,
          type: params.activity.type,
          metadata: params.activity.metadata(existing.status),
        });
      }

      return updated;
    });
  }

  private formatFollowUpDate(value: Date): string {
    return value.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  private extractRequestedStatus(
    statusField: Prisma.OutreachLeadUpdateInput['status'],
  ): LeadStatus | undefined {
    if (!statusField) {
      return undefined;
    }

    if (typeof statusField === 'string') {
      return statusField as LeadStatus;
    }

    if ('set' in statusField) {
      return statusField.set as LeadStatus;
    }

    return undefined;
  }

  private async logActivity(
    tx: Prisma.TransactionClient,
    input: {
      leadId: string;
      type: ActivityType;
      metadata?: Prisma.InputJsonValue;
    },
  ) {
    await tx.leadActivity.create({
      data: {
        leadId: input.leadId,
        type: input.type,
        metadata: input.metadata,
      },
    });
  }

  private normalizeImportLead(lead: ImportLeadItemDto): {
    businessName: string;
    serviceType: string;
    area: string;
    phone?: string;
    email?: string;
    website?: string;
    source: string;
    sourceUrl?: string;
    rating?: number;
    reviewCount?: number;
    status?: LeadStatus;
    priority?: LeadPriority;
    nextAction?: string;
    lastContactedAt?: Date;
    nextFollowUpAt?: Date;
    dedupeKey: string;
    isValid: boolean;
  } {
    const businessName = this.cleanText(lead.businessName);
    const serviceType = this.cleanText(lead.serviceType);
    const area = this.cleanText(lead.area);
    const source = this.cleanText(lead.source);
    const phone = this.normalizePhone(lead.phone);
    const email = this.normalizeEmail(lead.email);
    const website = this.normalizeWebsite(lead.website);
    const sourceUrl = this.normalizeWebsite(lead.sourceUrl);
    const hasIdentity = Boolean(phone || email || website || sourceUrl);
    const baseValid = Boolean(businessName && serviceType && area && source);
    const isValid = baseValid && hasIdentity;
    const dedupeKey = buildLeadDedupeKey({
      businessName,
      area,
      source,
      phone,
      email,
      website,
      sourceUrl,
    });

    return {
      businessName: businessName ?? '',
      serviceType: serviceType ?? '',
      area: area ?? '',
      phone,
      email,
      website,
      source: source ?? '',
      sourceUrl,
      rating: lead.rating,
      reviewCount: lead.reviewCount,
      status: lead.status,
      priority: lead.priority,
      nextAction: this.cleanText(lead.nextAction),
      lastContactedAt: lead.lastContactedAt,
      nextFollowUpAt: lead.nextFollowUpAt,
      dedupeKey,
      isValid,
    };
  }

  private cleanText(value: string | undefined): string | undefined {
    const cleaned = value?.trim();
    return cleaned || undefined;
  }

  private normalizePhone(value: string | undefined): string | undefined {
    const cleaned = this.cleanText(value);
    if (!cleaned) {
      return undefined;
    }

    const compact = cleaned.replace(/[^\d+]/g, '');

    if (compact.startsWith('+')) {
      return `+${compact.slice(1).replace(/[^\d]/g, '')}`;
    }
    if (compact.startsWith('00')) {
      return `+${compact.slice(2)}`;
    }
    if (compact.startsWith('0')) {
      return `+353${compact.slice(1)}`;
    }

    return compact;
  }

  private normalizeEmail(value: string | undefined): string | undefined {
    const cleaned = this.cleanText(value)?.toLowerCase();
    if (!cleaned || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleaned)) {
      return undefined;
    }

    return cleaned;
  }

  private normalizeWebsite(value: string | undefined): string | undefined {
    const cleaned = this.cleanText(value);
    if (!cleaned) {
      return undefined;
    }

    const withProtocol = /^https?:\/\//i.test(cleaned)
      ? cleaned
      : `https://${cleaned}`;

    try {
      const url = new URL(withProtocol);
      if (!['http:', 'https:'].includes(url.protocol)) {
        return undefined;
      }
      url.hash = '';
      return url.toString().replace(/\/$/, '');
    } catch {
      return undefined;
    }
  }
}
