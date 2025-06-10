import {Elysia, t} from 'elysia'

import {db} from "../database";
import {jwt} from "@elysiajs/jwt";
import 'bun:dotenv';


export const auth = new Elysia({prefix: '/auth'})
    .use(jwt({
        name: 'jwt',
        secret: process.env.JWT_SECRET!
    }))
    .model({
        loginData: t.Object({
            email: t.String({minLength: 6, maxLength: 32, format: "email"}),
            password: t.String({minLength: 8})
        }),
        registerData: t.Object({
            name: t.String({minLength: 6, maxLength: 32}),
            email: t.String({minLength: 6, maxLength: 32, format: "email"}),
            password: t.String({minLength: 8})
        }),
        error: t.Object({
            message: t.String()
        })
    })
    .post('/login', async ({jwt, cookie: {auth}, body, error}) => {
        const user = await db.user.findUnique({
            where: {
                email: body.email.toLowerCase()
            },
            select: {
                id: true,
                password: true
            }
        })

        if (!user) return error(401, {message: "Wrong email or/and password"});
        if (!(await Bun.password.verify(body.password, user.password, "bcrypt"))) return error(401, {message: "Wrong email or/and password"});

        auth.set({
            value: await jwt.sign({id: user.id}),
            httpOnly: true,
            maxAge: 7 * 86400,
            path: '/',
        })
    }, {
        body: 'loginData',
        detail: {
            tags: ['auth']
        },
        response: {
            200: t.Any(),
            401: 'error'
        }
    })
    .post('/logout', async ({cookie: {auth}}) => {
        auth.remove();
    }, {
        detail: {
            tags: ['auth']
        },
        response: {
            200: t.Any()
        }
    })
    .put('/register', async ({jwt, cookie: {auth}, body, error}) => {
        const possibleConflict = await db.user.findUnique({
            where: {
                email: body.email.toLowerCase()
            }
        })

        if (possibleConflict) return error(403, {message: "User already exists"})

        const result = await db.user.create({
            data: {
                email: body.email.toLowerCase(),
                name: body.name,
                password: await Bun.password.hash(body.password, {
                    algorithm: "bcrypt",
                    cost: 8
                }),
                baseCurrencyId: process.env.DEFAULT_CURRENCY_ID
            }
        })

        auth.set({
            value: await jwt.sign({id: result.id}),
            httpOnly: true,
            maxAge: 7 * 86400,
            path: '/',
        });

    }, {
        body: 'registerData',
        detail: {
            tags: ['auth']
        },
        response: {
            200: t.Any(),
            403: 'error'
        }
    })