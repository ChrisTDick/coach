import axios, { AxiosInstance } from 'axios';
import { IntervalsConfig } from './config';

interface Activity {
  id: string;
  start_date_local: string;
  type: string;
  name: string;
  distance?: number;
  moving_time?: number;
  elapsed_time?: number;
  average_hr?: number;
  [key: string]: any;
}

interface Workout {
  start_date_local: string;
  type: string;
  name: string;
  description: string;
  category?: string;
}

export class IntervalsClient {
  private client: AxiosInstance;
  private apiKey: string;

  constructor(config: IntervalsConfig) {
    this.apiKey = config.apiKey;
    const baseUrl = config.baseUrl || 'https://intervals.icu/api/v1';

    this.client = axios.create({
      baseURL: baseUrl,
      auth: {
        username: 'API_KEY',
        password: this.apiKey,
      },
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Get athlete info to verify authentication
   */
  async getAthlete(athleteId: string) {
    const response = await this.client.get(`/athlete/${athleteId}`);
    return response.data;
  }

  /**
   * Get activities for an athlete
   * @param athleteId - The athlete ID
   * @param oldest - Oldest date (YYYY-MM-DD), defaults to 90 days ago
   * @param newest - Newest date (YYYY-MM-DD), defaults to today
   */
  async getActivities(
    athleteId: string,
    oldest?: string,
    newest?: string
  ): Promise<Activity[]> {
    // Default to last 90 days if not specified
    const now = new Date();
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

    const params: any = {
      oldest: oldest || ninetyDaysAgo.toISOString().split('T')[0],
      newest: newest || now.toISOString().split('T')[0],
    };

    const response = await this.client.get(`/athlete/${athleteId}/activities`, {
      params,
    });
    return response.data;
  }

  /**
   * Upload a workout to an athlete's calendar
   * @param athleteId - The athlete ID
   * @param workout - Workout details
   */
  async uploadWorkout(athleteId: string, workout: Workout) {
    const event = {
      start_date_local: workout.start_date_local,
      type: workout.type,
      name: workout.name,
      description: workout.description,
      category: workout.category || 'WORKOUT',
    };

    const response = await this.client.post(
      `/athlete/${athleteId}/events`,
      event
    );
    return response.data;
  }

  /**
   * Get calendar events (including planned workouts)
   * @param athleteId - The athlete ID
   * @param oldest - Oldest date (YYYY-MM-DD), defaults to 30 days ago
   * @param newest - Newest date (YYYY-MM-DD), defaults to 30 days from now
   */
  async getCalendarEvents(
    athleteId: string,
    oldest?: string,
    newest?: string
  ) {
    // Default to 30 days in past and future
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const params: any = {
      oldest: oldest || thirtyDaysAgo.toISOString().split('T')[0],
      newest: newest || thirtyDaysFromNow.toISOString().split('T')[0],
    };

    const response = await this.client.get(`/athlete/${athleteId}/events`, {
      params,
    });
    return response.data;
  }

  /**
   * Delete a calendar event
   * @param athleteId - The athlete ID
   * @param eventId - The event ID to delete
   */
  async deleteEvent(athleteId: string, eventId: string) {
    const response = await this.client.delete(
      `/athlete/${athleteId}/events/${eventId}`
    );
    return response.data;
  }
}
