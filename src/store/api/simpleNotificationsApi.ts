import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

export const simpleNotificationsApi = createApi({
  reducerPath: 'simpleNotifications',
  baseQuery: fetchBaseQuery({
    baseUrl: 'https://truereach-production.up.railway.app',
    prepareHeaders: (headers) => {
      headers.set(
        'Authorization',
        'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJDUC0wMDEiLCJlbWFpbCI6ImNwMUBzb2xhcml1bS5jb20iLCJwaG9uZSI6Ijk4NzY1NDMyMTMiLCJyb2xlIjoiQ1AiLCJuYW1lIjoiQ2hhbm5lbCBQYXJ0bmVyIDEiLCJpYXQiOjE3NTI0NzQzMTEsImV4cCI6MTc1MjU2MDcxMX0.aUr1BjQPmqE59k78jMzgn6T3ifewK7_YU_lWlCNrddM'
      );
      headers.set('accept', '*/*');
      return headers;
    },
  }),
  endpoints: (builder) => ({
    getNotifications: builder.query<any, void>({
      query: () =>
        '/api/v1/notifications?page=1&limit=20&status=unread&sortBy=createdAt&sortOrder=desc',
    }),
  }),
});

export const { useGetNotificationsQuery } = simpleNotificationsApi;
