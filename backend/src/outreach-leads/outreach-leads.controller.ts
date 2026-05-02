import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  ParseEnumPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { LeadPriority, LeadStatus } from '@prisma/client';
import { CreateLeadDto } from './dto/create-lead.dto';
import { ImportLeadsDto } from './dto/import-leads.dto';
import { CreateMessageDto } from './dto/create-message.dto';
import { CreateNoteDto } from './dto/create-note.dto';
import { GenerateMessageDto } from './dto/generate-message.dto';
import { ScheduleFollowUpDto } from './dto/schedule-follow-up.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';
import { OutreachLeadsService } from './outreach-leads.service';

function parseOptionalNonNegativeInt(raw?: string): number | undefined {
  if (raw === undefined || raw === '') {
    return undefined;
  }
  const n = parseInt(raw, 10);
  if (Number.isNaN(n) || n < 0) {
    throw new BadRequestException(
      'Follow-up count filters must be non-negative integers',
    );
  }
  return n;
}

/** v1: create/read/update + notes/messages; no DELETE. */
@Controller('outreach-leads')
export class OutreachLeadsController {
  constructor(private readonly outreachLeadsService: OutreachLeadsService) {}

  @Post()
  create(@Body() dto: CreateLeadDto) {
    return this.outreachLeadsService.create(dto);
  }

  @Post('import')
  importLeads(@Body() dto: ImportLeadsDto) {
    return this.outreachLeadsService.importLeads(dto);
  }

  @Get()
  findAll(
    @Query('status', new ParseEnumPipe(LeadStatus, { optional: true }))
    status?: LeadStatus,
    @Query('priority', new ParseEnumPipe(LeadPriority, { optional: true }))
    priority?: LeadPriority,
    @Query('area') area?: string,
    @Query('serviceType') serviceType?: string,
    @Query('minFollowUps') minFollowUpsRaw?: string,
    @Query('maxFollowUps') maxFollowUpsRaw?: string,
  ) {
    const minFollowUps = parseOptionalNonNegativeInt(minFollowUpsRaw);
    const maxFollowUps = parseOptionalNonNegativeInt(maxFollowUpsRaw);
    if (
      minFollowUps !== undefined &&
      maxFollowUps !== undefined &&
      minFollowUps > maxFollowUps
    ) {
      throw new BadRequestException(
        'minFollowUps cannot be greater than maxFollowUps',
      );
    }
    return this.outreachLeadsService.findAll({
      status,
      priority,
      area,
      serviceType,
      minFollowUps,
      maxFollowUps,
    });
  }

  @Get('follow-ups/due')
  getDueFollowUps(@Query('includeFuture') includeFuture?: string) {
    return this.outreachLeadsService.getDueFollowUps(includeFuture === 'true');
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.outreachLeadsService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateLeadDto) {
    return this.outreachLeadsService.update(id, dto);
  }

  @Patch(':id/mark-contacted')
  markContacted(@Param('id') id: string) {
    return this.outreachLeadsService.markContacted(id);
  }

  @Patch(':id/mark-replied')
  markReplied(@Param('id') id: string) {
    return this.outreachLeadsService.markReplied(id);
  }

  @Patch(':id/mark-interested')
  markInterested(@Param('id') id: string) {
    return this.outreachLeadsService.markInterested(id);
  }

  @Patch(':id/mark-not-interested')
  markNotInterested(@Param('id') id: string) {
    return this.outreachLeadsService.markNotInterested(id);
  }

  @Patch(':id/schedule-follow-up')
  scheduleFollowUp(@Param('id') id: string, @Body() dto: ScheduleFollowUpDto) {
    return this.outreachLeadsService.scheduleFollowUp(id, dto.nextFollowUpAt);
  }

  @Patch(':id/mark-follow-up-done')
  markFollowUpDone(@Param('id') id: string) {
    return this.outreachLeadsService.markFollowUpCompleted(id);
  }

  @Post(':id/notes')
  addNote(@Param('id') id: string, @Body() dto: CreateNoteDto) {
    return this.outreachLeadsService.addNote(id, dto);
  }

  @Post(':id/messages')
  addMessage(@Param('id') id: string, @Body() dto: CreateMessageDto) {
    return this.outreachLeadsService.addMessage(id, dto);
  }

  @Post(':id/generate-message')
  generateMessage(@Param('id') id: string, @Body() dto: GenerateMessageDto) {
    return this.outreachLeadsService.generateMessage(id, dto);
  }

  @Post(':id/generate-follow-up')
  generateFollowUp(@Param('id') id: string, @Body() dto: GenerateMessageDto) {
    return this.outreachLeadsService.generateFollowUpMessage(id, dto);
  }
}
