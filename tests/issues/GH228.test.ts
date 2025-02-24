import { Entity, ManyToOne, MikroORM, PrimaryKey, Property, Logger } from '@mikro-orm/core';
import type { SqliteDriver } from '@mikro-orm/sqlite';
import { SchemaGenerator } from '@mikro-orm/sqlite';

@Entity()
export class B {

  @PrimaryKey({ type: 'number' })
  id!: number;

  @Property({ type: 'string' })
  name!: string;

}

@Entity()
export class A {

  @PrimaryKey({ type: 'number' })
  id!: number;

  @Property({ type: 'string' })
  name!: string;

  @ManyToOne(() => B)
  type!: B;

}

describe('GH issue 228', () => {

  let orm: MikroORM<SqliteDriver>;

  beforeAll(async () => {
    orm = await MikroORM.init({
      entities: [A, B],
      dbName: ':memory:',
      type: 'sqlite',
    });
    await new SchemaGenerator(orm.em).dropSchema();
    await new SchemaGenerator(orm.em).createSchema();
  });

  afterAll(() => orm.close(true));

  test('search by m:n', async () => {
    const a = new A();
    a.name = 'a';
    a.type = new B();
    a.type.name = 'b';
    await orm.em.persistAndFlush(a);
    orm.em.clear();

    const mock = jest.fn();
    const logger = new Logger(mock, ['query']);
    Object.assign(orm.config, { logger });
    await orm.em.findAndCount(A, {}, {
      orderBy: { type: 'asc' },
      populate: true,
    });

    const queries: string[] = mock.mock.calls.map(c => c[0]).sort();
    expect(queries).toHaveLength(3);
    expect(queries[0]).toMatch('select `e0`.* from `a` as `e0` order by `e0`.`type_id` asc');
    expect(queries[1]).toMatch('select `e0`.* from `b` as `e0` where `e0`.`id` in (?)');
  });

});
