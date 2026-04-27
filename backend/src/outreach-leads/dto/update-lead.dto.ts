import { PartialType } from '@nestjs/mapped-types';
import { CreateLeadDto } from './create-lead.dto';

/** All create fields optional for PATCH. */
export class UpdateLeadDto extends PartialType(CreateLeadDto) {}
