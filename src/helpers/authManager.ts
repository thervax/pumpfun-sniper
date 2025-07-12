import axios from "axios";
import { parse as parseCookie } from "cookie";

export class AuthManager {
  private authToken = "";
  private refreshToken = process.env.AXIOM_REFRESH_TOKEN;
  private interval: NodeJS.Timeout;
  private intervalMs = 60 * 1000;

  constructor() {
    this.updateToken();

    this.interval = setInterval(() => {
      this.updateToken();
    }, this.intervalMs);
  }

  private async updateToken() {
    try {
      const response = await axios.post(
        "https://api10.axiom.trade/refresh-access-token",
        {},
        {
          headers: {
            Cookie: `auth-refresh-token=${this.refreshToken}`,
          },
        }
      );

      const setCookieHeaders = response.headers["set-cookie"];
      if (!setCookieHeaders || !Array.isArray(setCookieHeaders)) {
        console.log("[ERROR] No Set-Cookie headers received");
        return;
      }

      for (const header of setCookieHeaders) {
        const parsed = parseCookie(header);
        if (parsed["auth-access-token"] !== undefined) {
          this.authToken = parsed["auth-access-token"];
        }
        if (parsed["auth-refresh-token"] !== undefined) {
          this.refreshToken = parsed["auth-refresh-token"];
        }
      }
    } catch (err) {
      console.log(`[ERROR] Failed to update auth tokens: ${err}`);
    }
  }

  public getTokens() {
    return {
      authToken: this.authToken,
      refreshToken: this.refreshToken,
    };
  }

  public setTokens(authToken: string, refreshToken: string): void {
    this.authToken = authToken;
    this.refreshToken = refreshToken;
  }
}

export const authManager = new AuthManager();
