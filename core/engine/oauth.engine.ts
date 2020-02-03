import { BaseUtil } from '../../utils/base.util';
import fetch from "node-fetch";

export abstract class OAuthEngine {
    protected abstract authorizeBaseURL: string;
    protected abstract tokenURL: string;
    protected abstract clientID: string;
    protected abstract clientSecret: string;
    protected abstract redirectURL: string;
    public static redirectUrlPrefix: string = "http://teachtogether.tk/";
    protected abstract identifyURL: string;
    protected abstract scope: string;

    public getAuthorizeURL(): string {
        return this.authorizeBaseURL + BaseUtil.makeQueryString({
            client_id: this.clientID,
            redirect_uri: this.redirectURL,
            response_type: "code",
            scope: this.scope
        }, true, ["scope"]);
    }

    protected authenticate(authorizationCode: string): Promise<any> {
        return new Promise((resolve, reject) => {
            fetch(this.tokenURL, {
                method: "post",
                body: BaseUtil.makeQueryString({
                    client_id: this.clientID,
                    client_secret: this.clientSecret,
                    grant_type: "authorization_code",
                    code: authorizationCode,
                    redirect_uri: this.redirectURL,
                    scope: this.scope
                }, false, ["scope"]),
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            }).then(res => res.json())
            .then(data => {
                if (data.error) {
                    reject(data);
                } else {
                    resolve(data);
                }
            }).catch(reject);
        });
    }

    protected identify(tokenType: string, accessToken: string): Promise<any> {
        return new Promise((resolve, reject) => {
            fetch(this.identifyURL, {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Authorization': `${tokenType} ${accessToken}`
                }
            }).then(res => res.json())
            .then(resolve).catch(reject);
        });
    }
}