import {
  ArgumentMetadata,
  BadRequestException,
  Injectable,
  Optional,
} from '../index';
import { Type } from '../interfaces';
import { PipeTransform } from '../interfaces/features/pipe-transform.interface';
import { isString } from '../utils/shared.utils';
import { ValidationPipe, ValidationPipeOptions } from './validation.pipe';

const VALIDATION_ERROR_MESSAGE = 'Validation failed (parsable array expected)';
const DEFAULT_ARRAY_SEPARATOR = ',';

export interface ParseArrayOptions
  extends Omit<
    ValidationPipeOptions,
    'transform' | 'validateCustomDecorators'
  > {
  items?: Type<unknown>;
  separator?: string;
  optional?: boolean;
}

/**
 * Defines the built-in ParseArray Pipe
 *
 * @see [Built-in Pipes](https://docs.nestjs.com/pipes#built-in-pipes)
 *
 * @publicApi
 */
@Injectable()
export class ParseArrayPipe implements PipeTransform {
  protected readonly validationPipe: ValidationPipe;

  constructor(@Optional() private readonly options: ParseArrayOptions = {}) {
    this.validationPipe = new ValidationPipe({
      transform: true,
      validateCustomDecorators: true,
      ...options,
    });
  }

  /**
   * Method that accesses and performs optional transformation on argument for
   * in-flight requests.
   *
   * @param value currently processed route argument
   * @param metadata contains metadata about the currently processed route argument
   */
  async transform(value: any, metadata: ArgumentMetadata): Promise<any> {
    if (!value && !this.options.optional) {
      throw new BadRequestException(VALIDATION_ERROR_MESSAGE);
    }

    if (!Array.isArray(value) && !this.options.optional) {
      if (!isString(value)) {
        throw new BadRequestException(VALIDATION_ERROR_MESSAGE);
      } else {
        try {
          value = value
            .trim()
            .split(this.options.separator || DEFAULT_ARRAY_SEPARATOR);
        } catch {
          throw new BadRequestException(VALIDATION_ERROR_MESSAGE);
        }
      }
    }
    if (this.options.items) {
      const validationMetadata: ArgumentMetadata = {
        metatype: this.options.items,
        type: 'query',
      };

      const toClassInstance = (item: any) => {
        try {
          item = JSON.parse(item);
        } catch {}
        return this.validationPipe.transform(item, validationMetadata);
      };
      value = await Promise.all((value as unknown[]).map(toClassInstance));
    }
    return value;
  }
}
