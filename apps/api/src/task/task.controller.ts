import { Body, Controller, Delete, Get, Headers, Param, Patch, Post } from '@nestjs/common'

import { CreateTaskDto, UpdateTaskDto } from './dto/create-task.dto'
import { TaskService } from './task.service'

@Controller('tasks')
export class TaskController {
  constructor(private readonly taskService: TaskService) {}

  @Get()
  list(@Headers('x-user-id') userId: string) {
    return this.taskService.list(userId)
  }

  @Post()
  create(@Headers('x-user-id') userId: string, @Body() payload: CreateTaskDto) {
    return this.taskService.create(userId, payload)
  }

  @Patch(':taskId')
  update(
    @Headers('x-user-id') userId: string,
    @Param('taskId') taskId: string,
    @Body() payload: UpdateTaskDto,
  ) {
    return this.taskService.update(userId, taskId, payload)
  }

  @Delete(':taskId')
  remove(@Headers('x-user-id') userId: string, @Param('taskId') taskId: string) {
    return this.taskService.remove(userId, taskId)
  }
}
