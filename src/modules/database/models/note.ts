import { type Kysely } from 'kysely'
import { jsonBuildObject } from 'kysely/helpers/sqlite'

import type { DB, Note as TransformNote } from '../transform-types'
import { Model, get, injectModel } from './model'
import { Label } from './label'
import { Plan } from './plan'

@injectModel({
  relation: {
    label: Label,
    plan: Plan,
  },
})
export class Note extends Model<TransformNote> {
  table = 'note' as const

  #label: Label
  #plan: Plan

  constructor(kysely: Kysely<DB>, label: Label, plan: Plan) {
    super(kysely)
    this.#label = label
    this.#plan = plan
  }

  removeBy(value: { planId?: number; labelId?: number }) {
    let query = this.baseRemove()
    if (value.planId)
      query = query.where('planId', '=', value.planId)
    if (value.labelId)
      query = query.where('labelId', '=', value.labelId)

    return query
  }

  @get()
  select(value?: { id?: number; start?: number; end?: number; planId?: number; labelId?: number; labelIdList?: number[] }) {
    let query = this.kysely.with('l', () => this.#label.select()).with('p', () => this.#plan.select()).selectFrom(['note', 'l', 'p']).where('note.deletedAt', '=', 0)
    if (value?.id)
      query = query.where('note.id', '=', value.id)
    if (value?.start)
      query = query.where('end', '>', value.start)
    if (value?.end)
      query = query.where('start', '<', value.end)
    if (value?.planId)
      query = query.where('note.planId', '=', value.planId)
    if (value?.labelId)
      query = query.where('labelId', '=', value.labelId)
    if (value?.labelIdList)
      query = query.where('labelId', 'in', value.labelIdList)

    return query.select(eb => [
      jsonBuildObject({
        id: eb.ref('l.id'),
        name: eb.ref('l.name'),
        color: eb.ref('l.color'),
        sort: eb.ref('l.sort'),
        planId: eb.ref('l.planId'),
        hidden: eb.ref('l.hidden'),
        deletedAt: eb.ref('l.deletedAt'),
        createdAt: eb.ref('l.createdAt'),
        updatedAt: eb.ref('l.updatedAt'),
        totalTime: eb.ref('l.totalTime'),
      }).as('label'),
      jsonBuildObject({
        id: eb.ref('p.id'),
        name: eb.ref('p.name'),
        color: eb.ref('p.color'),
        sort: eb.ref('p.sort'),
        hidden: eb.ref('p.hidden'),
        deletedAt: eb.ref('p.deletedAt'),
        createdAt: eb.ref('p.createdAt'),
        updatedAt: eb.ref('p.updatedAt'),
        totalTime: eb.ref('p.totalTime'),
      }).as('plan'),
    ]).selectAll(this.table).whereRef('note.labelId', '=', 'l.id').whereRef('note.planId', '=', 'p.id')
  }

  @get()
  selectByDimension(value: { start: number; end: number; dimensionId: number }) {
    const { start, end, dimensionId } = value
    return this.transaction().execute(trx => trx.dimensionLabel.select({
      dimensionId,
    })
      .then(list => list.map(i => i.labelId))
      .then(idList => trx.note.select({
        start,
        end,
        labelIdList: idList,
      })))
  }
}
