import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

// Define interfaces
export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: string;
  severity: string;
  read: boolean;
  createdAt: string;
  metadata?: any;
}

export interface NotificationsResponse {
  success: boolean;
  data: {
    notifications: NotificationItem[];
    total: number;
    unreadCount: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

// Create the API
export const notificationsApi = createApi({
  reducerPath: 'notificationsApi',
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
  tagTypes: ['Notifications'],
  endpoints: (builder) => ({
    getUnreadNotifications: builder.query<NotificationsResponse, void>({
      query: () =>
        '/api/v1/notifications?page=1&limit=20&status=unread&sortBy=createdAt&sortOrder=desc',
      providesTags: ['Notifications'],
    }),
  }),
});

export const { useGetUnreadNotificationsQuery } = notificationsApi;

// Debug log
console.log(
  '✅ notificationsApi created with reducerPath:',
  notificationsApi.reducerPath
);
