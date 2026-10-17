import { Checkpoint, CheckpointMetadata } from '@langchain/langgraph'
import { RunnableConfig } from '@langchain/core/runnables'
import { IDatabaseEntity } from '../../../src'
import { DataSource } from 'typeorm'

export type SaverOptions = {
    datasourceOptions: any
    threadId: string
    appDataSource: DataSource
    databaseEntities: IDatabaseEntity
    chatflowid: string
    orgId: string
}

export interface CheckpointTuple {
    config: RunnableConfig
    checkpoint: Checkpoint
    metadata?: CheckpointMetadata
    parentConfig?: RunnableConfig
}

export interface SerializerProtocol<D = any> {
    stringify?(obj: D): string
    parse?(data: string): Promise<D>
    dumpsTyped?(data: any): Promise<[string, Uint8Array]>
    loadsTyped?(type: string, data: Uint8Array | string): Promise<any>
}

export type CheckpointListOptions = {
    limit?: number
    before?: RunnableConfig
    filter?: Record<string, any>
}
