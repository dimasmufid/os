import { Injectable } from '@nestjs/common';
import { CreateRealtimeDto } from './dto/create-realtime.dto';
import { UpdateRealtimeDto } from './dto/update-realtime.dto';

@Injectable()
export class RealtimeService {
  create(createRealtimeDto: CreateRealtimeDto) {
    void createRealtimeDto;
    return 'This action adds a new realtime';
  }

  findAll() {
    return `This action returns all realtime`;
  }

  findOne(id: number) {
    return `This action returns a #${id} realtime`;
  }

  update(id: number, updateRealtimeDto: UpdateRealtimeDto) {
    void updateRealtimeDto;
    return `This action updates a #${id} realtime`;
  }

  remove(id: number) {
    return `This action removes a #${id} realtime`;
  }
}
