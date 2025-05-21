import {Elysia} from "elysia";
import { cors } from '@elysiajs/cors';
import {swagger} from '@elysiajs/swagger'

import {currency} from "./routes/currency";
import {auth} from "./routes/auth";
import {user} from "./routes/user";

const app = new Elysia()
    .use(swagger({
        documentation: {
            info: {
                title: 'Currency tracker',
                version: '1.0.0'
            },
            tags: [
                {name: 'currency', description: 'Fetching currency data'},
                {name: 'auth', description: 'Authentication endpoints'},
                {name: 'user', description: 'User related data'}
            ]
        },
        provider: "swagger-ui"
    }))
    .use(cors({ origin: true}))
    .use(auth)
    .use(currency)
    .use(user)
    .listen(3001);

console.log(
    `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`
);
