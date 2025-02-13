export interface sqlInsertUpdate {
    affectedRows: number;
    changedRows: number;
    insertId: number;
}

export enum SQLType {
    select = 'select',
    insert = 'insert',
    update = 'update',
    delete = 'delete',
}

export enum LogType {
    ALL = 'ALL',
    SIMPLE = 'SIMPLE',
    NONE = 'NONE',
}

// SQL 타입 - insert / update / delete 인 경우  queryFunctionType 의 리턴 타입이 sqlInsertUpdate
export type SqlInsertUpdate = SQLType.insert | SQLType.update | SQLType.delete;

export type ResqultQuery<E> = E extends SqlInsertUpdate ? sqlInsertUpdate : Array<E>;
export type queryFunctionType = <E>(query: string, ...params: any[]) => Promise<ResqultQuery<E>>;

export type SqlResultParser = (k: string, v: any) => any;
export type ErrorLog = (query: string, params: any[]) => void;
