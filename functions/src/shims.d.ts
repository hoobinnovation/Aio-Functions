type Buffer = any;
declare const Buffer: any;
declare function require(name: string): any;

declare const process: {
  env: Record<string, string | undefined>;
};

declare const console: {
  log: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
};

declare module 'uuid' {
  export function v4(): string;
}

declare module 'joi' {
  interface ValidationResult<T = unknown> {
    value: T;
    error?: { details: Array<{ message: string }> };
  }
  interface Schema {
    validate(value: unknown, options?: unknown): ValidationResult;
  }
  interface AnySchema extends Schema {
    optional(): AnySchema;
    required(): AnySchema;
    pattern(regex: RegExp): AnySchema;
    valid(...values: unknown[]): AnySchema;
    integer(): AnySchema;
    positive(): AnySchema;
    guid(options?: unknown): AnySchema;
    allow(...values: unknown[]): AnySchema;
    max(limit: number): AnySchema;
    min(limit: number): AnySchema;
    keys(schema: Record<string, AnySchema>): AnySchema;
    custom(cb: (value: unknown, helpers: any) => unknown): AnySchema;
  }
  interface ArraySchema extends AnySchema {
    items(schema: AnySchema): ArraySchema;
  }
  interface DateSchema extends AnySchema {
    iso(): DateSchema;
  }
  interface JoiRoot {
    object(schema?: Record<string, AnySchema>): AnySchema;
    string(): AnySchema;
    any(): AnySchema;
    array(): ArraySchema;
    date(): DateSchema;
    number(): AnySchema;
    boolean(): AnySchema;
  }
  const Joi: JoiRoot;
  export default Joi;
}

declare module 'typeorm' {
  export class DataSource {
    constructor(options: unknown);
    isInitialized: boolean;
    initialize(): Promise<DataSource>;
    query(sql: string, params?: unknown[]): Promise<any>;
    getRepository<T>(entity: new () => T): any;
    transaction<T>(cb: (manager: EntityManager) => Promise<T>): Promise<T>;
  }
  export interface EntityManager {
    getRepository<T>(entity: new () => T): any;
  }
  export interface MigrationInterface {
    up(queryRunner: QueryRunner): Promise<void>;
    down(queryRunner: QueryRunner): Promise<void>;
  }
  export interface QueryRunner {
    query(sql: string, params?: unknown[]): Promise<any>;
  }
  export function Entity(options?: unknown): ClassDecorator;
  export function Column(options?: unknown): PropertyDecorator;
  export function PrimaryColumn(typeOrOptions?: unknown, options?: unknown): PropertyDecorator;
  export function PrimaryGeneratedColumn(options?: unknown): PropertyDecorator;
  export function CreateDateColumn(options?: unknown): PropertyDecorator;
  export function UpdateDateColumn(options?: unknown): PropertyDecorator;
  export function Index(name: string, fields: string[]): ClassDecorator;
}

declare module 'firebase-admin' {
  const admin: { initializeApp: () => void };
  export = admin;
}

declare module 'firebase-functions/v2/https' {
  export function onCall(handler: (request: any) => Promise<any> | any): any;
}

declare module 'firebase-functions/v2/storage' {
  export function onObjectFinalized(handler: (event: any) => Promise<void> | void): any;
}

declare module '@google-cloud/storage' {
  export class Storage {
    bucket(name: string): any;
  }
}

declare module 'sharp' {
  interface SharpInstance {
    resize(width: number, height: number, options?: unknown): SharpInstance;
    jpeg(options?: unknown): SharpInstance;
    toBuffer(): Promise<Buffer>;
  }
  function sharp(input: unknown): SharpInstance;
  export default sharp;
}


declare module 'crypto' {
  export function createHash(algo: string): { update: (input: string) => { digest: (enc: string) => string } };
  export function createHmac(algo: string, key: string): { update: (input: string) => { digest: (enc: string) => string } };
  export function timingSafeEqual(a: any, b: any): boolean;
}
