import { apiFetch } from './client'

export const uploadsApi = {
  uploadResume: (file: File) => {
    const formData = new FormData()
    formData.append('resume', file)
    return apiFetch<{ resumeText: string }>('/api/uploads/resume', {
      method: 'POST',
      body: formData,
    }).then((r) => r.resumeText)
  },
}
