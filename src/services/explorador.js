import { api } from './api.js';

class ExploradorService {
  /**
   * List files and folders from the given directory.
   * @param {'xlsx'|'pdfs'} folder - The root folder to explore
   * @param {string} [path=''] - Optional subdirectory path
   * @returns {Promise<{status, folder, root, currentPath, folders, files}>}
   */
  list(folder, path = '') {
    const params = { folder };
    if (path) params.path = path;
    return api.get('files/list', params);
  }
}

export const explorador = new ExploradorService();
