import {
  BadGatewayException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import OpenAI from 'openai';
import type { MessageType, OutreachLead } from '@prisma/client';

const MODEL = 'gpt-4o-mini';
const MAX_TOKENS = 400;

export type OutreachTone = 'casual' | 'professional' | 'direct';

@Injectable()
export class OutreachGenerationService {
  private readonly logger = new Logger(OutreachGenerationService.name);

  async generateMessage(
    lead: Pick<
      OutreachLead,
      | 'businessName'
      | 'serviceType'
      | 'area'
      | 'rating'
      | 'reviewCount'
      | 'source'
      | 'website'
    >,
    tone: OutreachTone,
    instruction?: string,
  ): Promise<string> {
    const apiKey = process.env.OPENAI_API_KEY?.trim();
    if (!apiKey) {
      throw new ServiceUnavailableException(
        'OpenAI is not configured. Set OPENAI_API_KEY on the server.',
      );
    }

    const client = new OpenAI({ apiKey });

    const leadLines = [
      `Business name: ${lead.businessName}`,
      `Service type: ${lead.serviceType}`,
      `Area: ${lead.area}`,
      `Source: ${lead.source}`,
    ];
    if (lead.rating != null) {
      const reviews =
        lead.reviewCount != null
          ? ` (${lead.reviewCount} reviews)`
          : '';
      leadLines.push(`Rating: ${lead.rating}${reviews}`);
    }
    if (lead.website?.trim()) {
      leadLines.push(`Website: ${lead.website.trim()}`);
    }

    const toneHints: Record<OutreachTone, string> = {
      casual:
        'Warm and conversational, like a neighbour recommending work — still respectful.',
      professional:
        'Clear and polite business tone; concise and credible, not stiff or corporate jargon-heavy.',
      direct:
        'Short and to the point; say why you are reaching out and what you want next, without fluff.',
    };

    const userParts = [
      `Tone: ${tone} — ${toneHints[tone]}`,
      '',
      'Lead:',
      ...leadLines,
    ];
    if (instruction?.trim()) {
      userParts.push('', 'Extra instruction from the user:', instruction.trim());
    }

    const system = [
      'You write short first-contact outreach for a UK trades / local services marketplace (Tradeez).',
      'The reader is a local tradesperson or small trade business.',
      'Output a single plain-text message suitable for email or direct message.',
      'Keep it concise (roughly 3–6 short sentences unless the user asks otherwise).',
      'Sound natural and human; avoid hype, hard sell, fake familiarity, or markdown.',
      'Mention their service type and area when it helps personalise — do not invent facts.',
      'Do not claim you used their website or saw their work unless the lead includes a website (you may reference it lightly if present).',
    ].join(' ');

    try {
      const completion = await client.chat.completions.create({
        model: MODEL,
        temperature: 0.7,
        max_tokens: MAX_TOKENS,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: userParts.join('\n') },
        ],
      });

      const raw = completion.choices[0]?.message?.content?.trim() ?? '';
      if (!raw) {
        throw new BadGatewayException(
          'The AI returned an empty message. Try again.',
        );
      }
      return raw;
    } catch (err) {
      if (err instanceof BadGatewayException) throw err;
      this.logger.warn(
        `OpenAI request failed: ${err instanceof Error ? err.message : String(err)}`,
      );
      throw new BadGatewayException(
        'Failed to generate a message. Please try again in a moment.',
      );
    }
  }

  async generateFollowUpMessage(
    lead: Pick<
      OutreachLead,
      | 'businessName'
      | 'serviceType'
      | 'area'
      | 'rating'
      | 'reviewCount'
      | 'source'
      | 'website'
    >,
    previousMessages: Array<{ content: string; type: MessageType }>,
    tone: OutreachTone,
    instruction?: string,
  ): Promise<string> {
    const apiKey = process.env.OPENAI_API_KEY?.trim();
    if (!apiKey) {
      const greeting = lead.businessName ? `Hi ${lead.businessName},` : 'Hi there,';
      const lineTwo =
        lead.serviceType && lead.area
          ? `just following up on our earlier message about listing your ${lead.serviceType} services in ${lead.area} on Tradeez.`
          : 'just following up on our earlier message about joining Tradeez.';
      const instructionLine = instruction?.trim()
        ? ` ${instruction.trim()}`
        : ' If useful, I can share how similar local tradesmen are getting enquiries.';
      return `${greeting} ${lineTwo}${instructionLine}`.trim();
    }

    const previousSummary = previousMessages
      .slice(0, 3)
      .map((message, index) => `${index + 1}. (${message.type}) ${message.content}`)
      .join('\n');
    const followUpInstruction = [
      'Write a short follow-up outreach message.',
      'Keep it concise (2-4 sentences).',
      'Reference that this is a follow-up and keep the tone natural.',
      'Do not invent facts.',
    ].join(' ');
    const composedInstruction = [followUpInstruction, instruction?.trim()]
      .filter(Boolean)
      .join(' ');

    return this.generateMessage(
      lead,
      tone,
      [
        composedInstruction,
        previousSummary ? `Previous messages:\n${previousSummary}` : '',
      ]
        .filter(Boolean)
        .join('\n\n'),
    );
  }
}
