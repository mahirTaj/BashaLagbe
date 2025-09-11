// Admin API service for web scraping and data validation
const API_BASE_URL = process.env.NODE_ENV === 'production' ? '/api' : 'http://localhost:5000/api';

class AdminAPI {
  constructor() {
    this.baseURL = `${API_BASE_URL}/admin`;
    this.adminToken = 'superadmin-token'; // In production, get from secure storage
  }

  getHeaders() {
    return {
      'Content-Type': 'application/json',
      'admin-token': this.adminToken
    };
  }

  getMultipartHeaders() {
    return {
      'admin-token': this.adminToken
      // Don't set Content-Type for multipart/form-data, browser will set it with boundary
    };
  }

  async uploadScrapedData(csvFile) {
    try {
      const formData = new FormData();
      formData.append('csvFile', csvFile);

      const response = await fetch(`${this.baseURL}/upload-scraped-data`, {
        method: 'POST',
        headers: this.getMultipartHeaders(),
        body: formData
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Upload failed');
      }

      return await response.json();
    } catch (error) {
      console.error('Upload error:', error);
      throw error;
    }
  }

  async getValidationResults(validationId) {
    try {
      const response = await fetch(`${this.baseURL}/validation-results/${validationId}`, {
        headers: this.getHeaders()
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch validation results');
      }

      return await response.json();
    } catch (error) {
      console.error('Validation results error:', error);
      throw error;
    }
  }

  async submitValidatedData(validationId, selectedRecordIds) {
    try {
      const response = await fetch(`${this.baseURL}/submit-validated-data`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          validationId,
          selectedRecordIds
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Submission failed');
      }

      return await response.json();
    } catch (error) {
      console.error('Submission error:', error);
      throw error;
    }
  }

  async getAverageRent(params = {}) {
    const query = new URLSearchParams(params).toString();
    const response = await fetch(`${this.baseURL}/analytics/average-rent?${query}`, { headers: this.getHeaders() });
    if (!response.ok) throw new Error('Failed to fetch analytics');
    return response.json();
  }

  async getDistrictAnalytics() {
    const response = await fetch(`${this.baseURL}/analytics/districts`, { headers: this.getHeaders() });
    if (!response.ok) throw new Error('Failed to fetch district analytics');
    return response.json();
  }

  async getPropertyTypeAnalytics(params = {}) {
    const query = new URLSearchParams(params).toString();
    const url = query ? `${this.baseURL}/analytics/property-types?${query}` : `${this.baseURL}/analytics/property-types`;
    const response = await fetch(url, { headers: this.getHeaders() });
    if (!response.ok) throw new Error('Failed to fetch property type analytics');
    return response.json();
  }

  async getMonthlyTrends() {
    const response = await fetch(`${this.baseURL}/analytics/monthly-trends`, { headers: this.getHeaders() });
    if (!response.ok) throw new Error('Failed to fetch monthly trends');
    return response.json();
  }

  async getOverviewAnalytics() {
    const response = await fetch(`${this.baseURL}/analytics/overview`, { headers: this.getHeaders() });
    if (!response.ok) throw new Error('Failed to fetch overview analytics');
    return response.json();
  }

  async rebuildStats() {
    const response = await fetch(`${this.baseURL}/analytics/rebuild-stats`, { method: 'POST', headers: this.getHeaders(), body: JSON.stringify({}) });
    if (!response.ok) throw new Error('Failed to rebuild stats');
    return response.json();
  }

  async getPropertyFeatures() {
    const response = await fetch(`${this.baseURL}/analytics/property-features`, { headers: this.getHeaders() });
    if (!response.ok) throw new Error('Failed to fetch property features');
    return response.json();
  }

  async getPriceTrends() {
    const response = await fetch(`${this.baseURL}/analytics/price-trends`, { headers: this.getHeaders() });
    if (!response.ok) throw new Error('Failed to fetch price trends');
    return response.json();
  }

  async getUploadTrends() {
    const response = await fetch(`${this.baseURL}/analytics/upload-trends`, { headers: this.getHeaders() });
    if (!response.ok) throw new Error('Failed to fetch upload trends');
    return response.json();
  }

  async getAreaAnalytics(district = '') {
    const query = district ? `?district=${encodeURIComponent(district)}` : '';
    const response = await fetch(`${this.baseURL}/analytics/areas${query}`, { headers: this.getHeaders() });
    if (!response.ok) throw new Error('Failed to fetch area analytics');
    return response.json();
  }

  async getMarketSamples(params = {}) {
    const query = new URLSearchParams(params).toString();
    const response = await fetch(`${this.baseURL}/market-samples?${query}`, { headers: this.getHeaders() });
    if (!response.ok) throw new Error('Failed to fetch samples');
    return response.json();
  }

  async updateMarketSample(id, data) {
    const response = await fetch(`${this.baseURL}/market-samples/${id}`, {
      method: 'PATCH',
      headers: this.getHeaders(),
      body: JSON.stringify(data)
    });
    if (!response.ok) throw new Error('Failed to update sample');
    return response.json();
  }

  async deleteMarketSample(id) {
    const response = await fetch(`${this.baseURL}/market-samples/${id}`, {
      method: 'DELETE',
      headers: this.getHeaders()
    });
    if (!response.ok) throw new Error('Failed to delete sample');
    return response.json();
  }

  async bulkDeleteMarketSamples(ids) {
    const response = await fetch(`${this.baseURL}/market-samples/bulk-delete`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ ids })
    });
    if (!response.ok) throw new Error('Failed to bulk delete');
    return response.json();
  }

  // Mock functions for other admin features (to be implemented)
  async getReports() {
    // Mock data for reports
    return {
      reports: [
        {
          id: 1,
          type: 'inappropriate_content',
          listingId: 123,
          reportedBy: 'user@example.com',
          reason: 'Fake listing with misleading photos',
          status: 'pending',
          createdAt: '2024-01-15T10:30:00Z'
        },
        {
          id: 2,
          type: 'spam',
          listingId: 124,
          reportedBy: 'another@example.com',
          reason: 'Repeated posting of same property',
          status: 'reviewed',
          createdAt: '2024-01-14T15:45:00Z'
        }
      ]
    };
  }

  async getPendingListings() {
    // Mock data for pending listings
    return {
      listings: [
        {
          id: 1,
          title: '3 Bedroom Apartment in Gulshan',
          area: 'Gulshan',
          rent: 35000,
          status: 'pending_approval',
          submittedAt: '2024-01-15T12:00:00Z',
          submittedBy: 'owner@example.com'
        },
        {
          id: 2,
          title: 'Single Room for Bachelor',
          area: 'Dhanmondi',
          rent: 12000,
          status: 'pending_approval',
          submittedAt: '2024-01-15T14:30:00Z',
          submittedBy: 'landlord@example.com'
        }
      ]
    };
  }

  async getUsers() {
    // Mock data for user management
    return {
      users: [
        {
          id: 1,
          name: 'John Doe',
          email: 'john@example.com',
          status: 'active',
          joinedAt: '2024-01-10T08:00:00Z',
          listingsCount: 3,
          reportsCount: 0
        },
        {
          id: 2,
          name: 'Jane Smith',
          email: 'jane@example.com',
          status: 'flagged',
          joinedAt: '2024-01-12T10:15:00Z',
          listingsCount: 8,
          reportsCount: 2
        }
      ]
    };
  }
}

export default new AdminAPI();
