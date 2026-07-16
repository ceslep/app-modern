import { api } from './api.js';

class NotificationsService {
  /**
   * Get notifications for current user
   */
  getAll(options = {}) {
    return api.get('notifications', { all: options.all ? 1 : 0 });
  }

  /**
   * Get unread notification count
   */
  getUnreadCount() {
    return api.get('notifications/unread');
  }

  /**
   * Mark a notification as read
   */
  markAsRead(id) {
    return api.post(`notifications/${id}/read`);
  }

  /**
   * Mark all notifications as read
   */
  markAllAsRead() {
    return api.post('notifications/read-all');
  }

  /**
   * Create a notification
   */
  create(data) {
    return api.post('notifications', data);
  }

  /**
   * Delete a notification
   */
  delete(id) {
    return api.delete(`notifications/${id}`);
  }

  /**
   * Send a message to all teachers
   */
  sendMessage(text) {
    return api.post('notifications/send-message', { text });
  }
}

export const notifications = new NotificationsService();
