/**
 * Fetch Mock for Testing
 * Provides mock implementation for global fetch
 */

interface MockFetchResponse {
  ok: boolean;
  status: number;
  statusText: string;
  json: () => Promise<any>;
  text: () => Promise<string>;
  clone: () => MockFetchResponse;
}

class MockFetch {
  private static responses: Array<MockFetchResponse | Error> = [];
  private static callHistory: Array<{ url: string; options?: RequestInit }> =
    [];

  static mockResponse(response: Partial<MockFetchResponse> | Error) {
    if (response instanceof Error) {
      this.responses.push(response);
    } else {
      this.responses.push({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: () => Promise.resolve({}),
        text: () => Promise.resolve(''),
        clone: function () {
          return this;
        },
        ...response,
      });
    }
  }

  static mockReject(error: Error) {
    this.responses.push(error);
  }

  static clearMocks() {
    this.responses = [];
    this.callHistory = [];
  }

  static getCallHistory() {
    return [...this.callHistory];
  }

  static getLastCall() {
    return this.callHistory[this.callHistory.length - 1];
  }

  static fetch = jest
    .fn()
    .mockImplementation((url: string, options?: RequestInit) => {
      this.callHistory.push({ url, options });

      const response = this.responses.shift();

      if (!response) {
        return Promise.resolve({
          ok: true,
          status: 200,
          statusText: 'OK',
          json: () => Promise.resolve({}),
          text: () => Promise.resolve(''),
          clone: function () {
            return this;
          },
        });
      }

      if (response instanceof Error) {
        return Promise.reject(response);
      }

      return Promise.resolve(response);
    });
}

export default MockFetch;
