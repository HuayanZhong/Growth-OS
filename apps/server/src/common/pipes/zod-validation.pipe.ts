import { ArgumentMetadata, BadRequestException, Injectable, PipeTransform } from '@nestjs/common'
import type { ZodType } from 'zod'

/**
 * 基于 zod schema 的请求参数校验管道。
 * 与 env 校验同构（同一套 zod 技术栈），用法：
 *
 *   @Post()
 *   create(@Body(new ZodValidationPipe(createSchema)) dto: CreateInput) {}
 */
@Injectable()
export class ZodValidationPipe implements PipeTransform {
  constructor(private readonly schema: ZodType) {}

  transform(value: unknown, _metadata: ArgumentMetadata): unknown {
    const parsed = this.schema.safeParse(value)
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: '请求参数校验失败',
        details: parsed.error.issues.map((i) => ({
          path: i.path.join('.'),
          message: i.message,
        })),
      })
    }
    return parsed.data
  }
}
