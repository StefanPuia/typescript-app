import http from "http";
import expressWs from "express-ws";
import WebSocket from "ws";
import { Request } from 'express';
import { DebugUtil } from '../../utils/debug.util';

export class WSEngine {
    private static instance: WSEngine;
    private app: expressWs.Application;
    private routes: WSRoutes = {};
    public static readonly EVENT: {[key: string]: wsEvent} = {
        CLOSE: "close",
        ERROR: "error",
        UPGRADE: "upgrade",
        MESSAGE: "message",
        OPEN: "open",
        PING: "ping",
        PONG: "pong",
        UNEXPECTED: "unexpected-response"
    }

    private constructor(app: expressWs.Application) {
        this.app = app;
    }

    public static init(app: expressWs.Application) {
        WSEngine.instance = new WSEngine(app);
    }

    private static getInstance(): WSEngine {
        if (!WSEngine.instance) {
            throw new Error("Websocket Engine not initialized!");
        }
        return WSEngine.instance;
    }

    public static register(route: string, callee: any, createCallback?: Function) {
        DebugUtil.logInfo(`Registering WebSocket route '${route}'`, "WSEngine");
        const engine = WSEngine.getInstance();
        if (!engine.routes[route]) {
            const socket = engine.app.ws(route, (ws: WebSocket, req: Request) => {
                for (const key of Object.values(WSEngine.EVENT)) {
                    ws.on(key, engine.callback(route, key, callee, ws, req));
                }
                if (createCallback) {
                    createCallback.apply(callee, [ws, req]);
                }
            });
            engine.routes[route] = {
                route: route,
                socket: socket,
                events: {}
            }
        } else {
            throw new Error(`Websocket route '${route}' already registered.`);
        }
    }

    public static on(route: string, event: wsEvent, callback: Function) {
        const engine = WSEngine.getInstance();
        if (engine.routes[route]) {
            engine.routes[route].events[event] = callback;
        } else {
            throw new Error(`Websocket route '${route}' not registered.`);
        }
    }

    public static off(route: string, event: wsEvent): boolean {
        const engine = WSEngine.getInstance();
        if (engine.routes[route]) {
            engine.routes[route].events[event] = undefined;
            return true;
        }
        return false;
    }

    private getRoute(route: string): WSRoute | undefined {
        return this.routes[route];
    }

    private callback(route: string, event: wsEvent, callee: any, ws: WebSocket, req: Request) {
        return ((...args: any[]) => {
            const routeDef = this.getRoute(route);
            if (routeDef) {
                const callback: Function | undefined = routeDef.events[event];
                if (callback) {
                    const params: Array<any> = [ws, req];
                    callback.apply(callee, params.concat(Array.from(args)));
                } else if (event === "error") {
                    DebugUtil.logError(args[0], "WSEngine");
                }
            } else {
                throw new Error(`Websocket route ${route} not defined.`);
            }
        })
    }
}

export abstract class WSController {
    protected abstract route: string;

    public init() {
        WSEngine.register(this.getRoute(), this, this.onConnect);
        WSEngine.on(this.getRoute(), "close", this.onClose);
        WSEngine.on(this.getRoute(), "upgrade", this.onUpgrade);
        WSEngine.on(this.getRoute(), "message", this.onMessage);
        WSEngine.on(this.getRoute(), "open", this.onOpen);
        WSEngine.on(this.getRoute(), "ping", this.onPing);
        WSEngine.on(this.getRoute(), "pong", this.onPong);
        WSEngine.on(this.getRoute(), "unexpected-response", this.onUnexpected);
        WSEngine.on(this.getRoute(), "error", this.onError);
    }

    protected abstract getRoute(): string;
    protected abstract onConnect(ws: WebSocket, req: Request): void;
    protected abstract onClose(ws: WebSocket, req: Request, code: number, reason: string): void;
    protected abstract onUpgrade(ws: WebSocket, req: Request): void;
    protected abstract onMessage(ws: WebSocket, req: Request, data: WebSocket.Data): void;
    protected abstract onOpen(ws: WebSocket, req: Request): void;
    protected abstract onPing(ws: WebSocket, req: Request, data: Buffer): void;
    protected abstract onPong(ws: WebSocket, req: Request, data: Buffer): void;
    protected abstract onUnexpected(ws: WebSocket, req: Request, request: http.ClientRequest, response: http.IncomingMessage): void;
    protected onError(ws: WebSocket, req: Request, error: string) {
        DebugUtil.logError(error, "WSController", this.route);
    }
}

interface WSRoutes {
    [route: string]: WSRoute
}

interface WSRoute {
    route: string,
    socket: expressWs.WithWebsocketMethod,
    events: {
        [event in wsEvent]?: Function
    }
}

type wsEvent = "close" | "error" | "upgrade" | "message" | "open" | "ping" | "pong" | "unexpected-response";