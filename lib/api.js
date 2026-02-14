const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

function getToken() {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('glazefy_token');
}

async function request(endpoint, options = {}) {
    const token = getToken();
    const headers = { ...options.headers };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    // Don't set Content-Type for FormData
    if (!(options.body instanceof FormData)) {
        headers['Content-Type'] = 'application/json';
    }

    const res = await fetch(`${API_URL}${endpoint}`, { ...options, headers });
    const data = await res.json();

    if (!res.ok) {
        throw new Error(data.error || 'Request failed');
    }

    return data;
}

export const menuApi = {
    getItems: () => request('/api/menu'),
    addItem: (formData) => request('/api/menu/upload', { method: 'POST', body: formData }),
    updateItem: (id, data) => request(`/api/menu/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    deleteItem: (id) => request(`/api/menu/${id}`, { method: 'DELETE' }),
    getCategories: () => request('/api/menu/categories'),
};

export const qrApi = {
    getQRCode: () => request('/api/qrcode'),
};

export { API_URL };
