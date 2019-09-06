import { GenericValue } from '../generic.value';
import DatabaseUtil from '../../utils/database.util';

export class JobSandbox extends GenericValue {
    public static readonly entity: string = "job_sandbox";
    protected entity: string = JobSandbox.entity;
    protected primaryKeyField: string = "job_id";
    protected data?: jobSandboxData;

    public static readonly STATUS = {
        PENDING: "PENDING",
        RUNNING: "RUNNING",
        CANCELLED: "CANCELLED",
        FAILED: "FAILED",
        FINISHED: "FINISHED"
    }
    
    public static create(): JobSandbox {
        return new JobSandbox();
    }

    public static readonly definition: EntityDefinition = {
        "name": "job_sandbox",
        "fields": [{
            "name": "job_id",
            "type": DatabaseUtil.DATA_TYPE.NUMBER,
            "primaryKey": true,
            "autoIncrement": true,
            "notNull": true,
            "unique": true
        }, {
            "name": "parent_job_id",
            "type": DatabaseUtil.DATA_TYPE.NUMBER
        }, {
            "name": "status_id",
            "type": DatabaseUtil.DATA_TYPE.ID_SHORT
        }, {
            "name": "service",
            "type": DatabaseUtil.DATA_TYPE.ID_LONG
        }, {
            "name": "data",
            "type": DatabaseUtil.DATA_TYPE.TEXT
        }, {
            "name": "run_time",
            "type": DatabaseUtil.DATA_TYPE.DATETIME
        }, {
            "name": "max_retries",
            "type": DatabaseUtil.DATA_TYPE.NUMBER
        }, {
            "name": "result",
            "type": DatabaseUtil.DATA_TYPE.TEXT
        }]
    };

    public find(id: string): Promise<JobSandbox> {
        return this.doSelect(id, false);
    }
}

interface jobSandboxData {
    job_id: string,
    parent_job_id: string,
    status_id: "PENDING" | "RUNNING" | "CANCELLED" | "FAILED" | "FINISHED",
    service: string,
    data: string,
    run_time: Date,
    max_retries: number,
    result: string
}