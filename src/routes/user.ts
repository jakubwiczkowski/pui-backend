import {Elysia, t} from "elysia";
import {db} from "../database";
import {jwt} from "@elysiajs/jwt";

export const user = new Elysia({prefix: '/user'})
    .use(jwt({
        name: 'jwt',
        secret: process.env.JWT_SECRET!
    }))
    .model({
        currencyList: t.Array(t.String()),
        profile: t.Object({
            name: t.String(),
            email: t.String({format: "email"}),
            baseCurrency: t.String()
        }),
        error: t.Object({
            message: t.String()
        })
    })
    .get('/profile', async ({jwt, cookie: {auth}, body, error}) => {
        const authProfile = await jwt.verify(auth.value);

        if (authProfile === false) return error(401, {message: "Unauthorized"});

        const userId = authProfile.id as number;

        const profile = await db.user.findUnique({
            where: {
                id: userId
            }
        });

        if (!profile) return error(404, {message: "User data not found"});

        return {
            name: profile.name,
            email: profile.email,
            baseCurrency: profile.baseCurrencyId
        }
    }, {
        cookie: t.Cookie({
            auth: t.String()
        }),
        response: {
            200: 'profile',
            401: 'error',
            404: 'error'
        },
        detail: {
            tags: ['user']
        }
    })
    .patch('/basecurrency', async ({jwt, cookie: {auth}, body: {currency}, error}) => {
        const authProfile = await jwt.verify(auth.value);

        if (authProfile === false) return error(401, {message: "Unauthorized"});

        const userId = authProfile.id as number;

        const checkExists = await db.currency.findUnique({
            where: {
                id: currency.toLowerCase()
            }
        })

        if (!checkExists) return error(404, {message: "Currency not found"})

        await db.user.update({
            where: {
                id: userId
            },
            data: {
                baseCurrencyId: checkExists.id
            }
        })
    }, {
        cookie: t.Cookie({
            auth: t.String()
        }),
        body: t.Object({
            currency: t.String()
        }),
        response: {
            200: t.Any(),
            401: 'error',
            404: 'error'
        },
        detail: {
            tags: ['user']
        }
    })
    .get('/followed', async ({jwt, cookie: {auth}, error}) => {
        const authProfile = await jwt.verify(auth.value);

        if (authProfile === false) return error(401, {message: "Unauthorized"});

        const userId = authProfile.id as number;

        const followed = await db.followed_currencies.findMany({
            where: {
                userId: userId
            }
        });

        return followed.map(pair => pair.currencyId);
    }, {
        cookie: t.Cookie({
            auth: t.String()
        }),
        response: {
            200: 'currencyList',
            401: 'error'
        },
        detail: {
            tags: ['user']
        }
    })
    .post('/followed', async ({jwt, cookie: {auth}, body: {currency}, error}) => {
        const authProfile = await jwt.verify(auth.value);

        if (authProfile === false) return error(401, {message: "Unauthorized"});

        const userId = authProfile.id as number;

        const checkExists = await db.currency.findUnique({
            where: {
                id: currency.toLowerCase()
            }
        })

        if (!checkExists) return error(404, {message: "Currency not found"})

        const checkFollowed = await db.followed_currencies.findMany({
            where: {
                userId: userId,
                currencyId: currency.toLowerCase()
            }
        });

        if (checkFollowed.length > 0) return error(403, {message: "Currency is already added as followed"});

        await db.followed_currencies.create({
            data: {
                userId: userId,
                currencyId: currency.toLowerCase()
            }
        })
    }, {
        cookie: t.Cookie({
            auth: t.String()
        }),
        parse: "application/json",
        body: t.Object({
            currency: t.String()
        }),
        response: {
            200: t.Any(),
            401: 'error',
            403: 'error',
            404: 'error'
        },
        detail: {
            tags: ['user']
        }
    })
    .delete('/followed', async ({jwt, cookie: {auth}, body: {currency}, error}) => {
        const authProfile = await jwt.verify(auth.value);

        if (authProfile === false) return error(401, {message: "Unauthorized"});

        const userId = authProfile.id as number;

        const deleted = await db.followed_currencies.deleteMany({
            where: {
                userId: userId,
                currencyId: currency.toLowerCase()
            }
        });

        if (deleted.count == 0) return error(404, {message: "Currency not found in followed list"})
    }, {
        cookie: t.Cookie({
            auth: t.String()
        }),
        parse: "application/json",
        body: t.Object({
            currency: t.String()
        }),
        response: {
            200: t.Any(),
            404: 'error'
        },
        detail: {
            tags: ['user']
        }
    });