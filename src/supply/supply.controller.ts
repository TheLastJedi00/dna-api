import { Body, Controller, Param, Post } from '@nestjs/common';
import { SupplyService } from './supply.service';
import { RequestDto } from './dtos/request.dto';

@Controller('supply')
export class SupplyController {
  constructor(private readonly service: SupplyService) {}
  
  @Post()
  async requestGemini(@Body() content: RequestDto) {
      await this.service.request(content);
  }

  @Post('aurico/:userId')
  async createAuricoSupplyByUserId(@Param('userId') id:string){
    return await this.service.createAuricoSupplyById(id);
  }
}
