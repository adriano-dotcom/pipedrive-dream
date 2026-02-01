import { useState, useCallback, useEffect } from 'react';
import { useQuery, keepPreviousData, useQueryClient } from '@tanstack/react-query';

export interface PaginationState {
  pageIndex: number;
  pageSize: number;
}

export interface UsePaginatedQueryOptions<T> {
  queryKey: string[];
  queryFn: (range: { from: number; to: number }) => Promise<{ data: T[]; count: number | null }>;
  pageSize?: number;
  initialPage?: number;
  pageSizeStorageKey?: string;
  staleTime?: number;
  enabled?: boolean;
}

export interface UsePaginatedQueryResult<T> {
  data: T[];
  totalCount: number;
  pageCount: number;
  currentPage: number;
  pageSize: number;
  isLoading: boolean;
  isFetching: boolean;
  isPlaceholderData: boolean;
  goToPage: (page: number) => void;
  nextPage: () => void;
  previousPage: () => void;
  canNextPage: boolean;
  canPreviousPage: boolean;
  setPageSize: (size: number) => void;
  pagination: PaginationState;
  setPagination: React.Dispatch<React.SetStateAction<PaginationState>>;
  refetch: () => void;
}

export function usePaginatedQuery<T>(options: UsePaginatedQueryOptions<T>): UsePaginatedQueryResult<T> {
  const queryClient = useQueryClient();
  
  const {
    queryKey,
    queryFn,
    pageSize: initialPageSize = 25,
    initialPage = 0,
    pageSizeStorageKey,
    staleTime = 30000,
    enabled = true,
  } = options;

  // Initialize pagination state with localStorage persistence for pageSize
  const [pagination, setPagination] = useState<PaginationState>(() => {
    const savedPageSize = pageSizeStorageKey 
      ? Number(localStorage.getItem(pageSizeStorageKey)) || initialPageSize
      : initialPageSize;
    return {
      pageIndex: initialPage,
      pageSize: savedPageSize,
    };
  });

  // Persist pageSize to localStorage when it changes
  useEffect(() => {
    if (pageSizeStorageKey) {
      localStorage.setItem(pageSizeStorageKey, String(pagination.pageSize));
    }
  }, [pagination.pageSize, pageSizeStorageKey]);

  const from = pagination.pageIndex * pagination.pageSize;
  const to = from + pagination.pageSize - 1;

  // Main query with pagination
  const query = useQuery({
    queryKey: [...queryKey, 'paginated', pagination.pageIndex, pagination.pageSize],
    queryFn: () => queryFn({ from, to }),
    placeholderData: keepPreviousData,
    staleTime,
    enabled,
  });

  const totalCount = query.data?.count || 0;
  const pageCount = Math.max(1, Math.ceil(totalCount / pagination.pageSize));

  // Prefetch next page for smoother UX
  useEffect(() => {
    if (query.data && pagination.pageIndex < pageCount - 1 && enabled) {
      const nextFrom = (pagination.pageIndex + 1) * pagination.pageSize;
      const nextTo = nextFrom + pagination.pageSize - 1;
      
      queryClient.prefetchQuery({
        queryKey: [...queryKey, 'paginated', pagination.pageIndex + 1, pagination.pageSize],
        queryFn: () => queryFn({ from: nextFrom, to: nextTo }),
        staleTime,
      });
    }
  }, [query.data, pagination.pageIndex, pagination.pageSize, pageCount, queryClient, queryKey, queryFn, staleTime, enabled]);

  // Navigation functions
  const goToPage = useCallback((newPage: number) => {
    const validPage = Math.max(0, Math.min(newPage, pageCount - 1));
    setPagination(prev => ({ ...prev, pageIndex: validPage }));
  }, [pageCount]);

  const nextPage = useCallback(() => {
    goToPage(pagination.pageIndex + 1);
  }, [goToPage, pagination.pageIndex]);

  const previousPage = useCallback(() => {
    goToPage(pagination.pageIndex - 1);
  }, [goToPage, pagination.pageIndex]);

  const setPageSize = useCallback((size: number) => {
    setPagination({ pageIndex: 0, pageSize: size });
  }, []);

  const refetch = useCallback(() => {
    query.refetch();
  }, [query]);

  return {
    data: query.data?.data || [],
    totalCount,
    pageCount,
    currentPage: pagination.pageIndex,
    pageSize: pagination.pageSize,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isPlaceholderData: query.isPlaceholderData,
    goToPage,
    nextPage,
    previousPage,
    canNextPage: pagination.pageIndex < pageCount - 1,
    canPreviousPage: pagination.pageIndex > 0,
    setPageSize,
    pagination,
    setPagination,
    refetch,
  };
}
