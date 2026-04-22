import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  UseGuards,
  Logger,
} from '@nestjs/common';
import { DocuSignService } from './docusign.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('docusign')
export class DocuSignController {
  private readonly logger = new Logger(DocuSignController.name);

  constructor(private readonly docuSignService: DocuSignService) {}

  /**
   * Public endpoint for DocuSign Connect webhook callbacks.
   * No auth guard — DocuSign needs to POST here without a JWT.
   */
  @Post('webhook')
  async handleWebhook(@Body() payload: any) {
    this.logger.log('Received DocuSign webhook callback');
    const result = await this.docuSignService.handleWebhook(payload);
    return result;
  }

  /**
   * Authenticated endpoint to check envelope status.
   */
  @Get('status/:envelopeId')
  @UseGuards(JwtAuthGuard)
  async getStatus(@Param('envelopeId') envelopeId: string) {
    return this.docuSignService.getEnvelopeStatus(envelopeId);
  }
}
