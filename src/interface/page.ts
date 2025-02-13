export interface Paging {
    page: number;
    limit?: number;
}
export type seleceQueryOption = {
    query: string;
    page?: number;
    limit?: number;
};

export type SelectPagingResult<E> = {
    total: number;
    totalPage: number;
    limit: number;
    page: number;
    list: E[];
};
