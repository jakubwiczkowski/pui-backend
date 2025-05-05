import {Elysia, t} from "elysia";

const NBP_API_ENDPOINT = "https://api.nbp.pl/api/";
const NBP_API_FORMAT = "?format=json"

const fetchNBP = async (query: string) => {
    return await fetch(NBP_API_ENDPOINT + query + NBP_API_FORMAT, {cache: "reload", method: "GET"})
}

const extractDateFromISO = (date: Date) => {
    return date.toISOString().split('T')[0]
}

export const currency = new Elysia({prefix: '/currency'})
    .model({
        exchangeRate: t.Object({
            date: t.Date(),
            bid: t.Number(),
            ask: t.Number()
        }),
        currency: t.Object({
            code: t.String(),
            // TODO: find out why t.Ref('exchangeRate') is not working
            rates: t.Array(t.Object({
                date: t.Date(),
                bid: t.Number(),
                ask: t.Number()
            }))
        })
    })
    .get("/:code", async ({params: {code}, query: {startDate, endDate, date}, error}) => {
        if (date) {
            const preparedDate = extractDateFromISO(date);
            const response = await fetchNBP(`exchangerates/rates/c/${code.toLowerCase()}/${preparedDate}/`);

            if (response.status === 404) return error(404, {message: "Data not available"});

            return {
                code: code,
                rates: (await response.json())["rates"].map((rate: any) => ({
                    date: rate["effectiveDate"],
                    bid: rate["bid"],
                    ask: rate["ask"]
                }))
            };
        }

        if (startDate && endDate) {
            const preparedStartDate = extractDateFromISO(startDate);
            const preparedEndDate = extractDateFromISO(endDate);

            const response = await fetchNBP(`exchangerates/rates/c/${code.toLowerCase()}/${preparedStartDate}/${preparedEndDate}/`);

            if (response.status === 404) return error(404, {message: "Data not available"});

            return {
                code: code,
                rates: (await response.json())["rates"].map((rate: any) => ({
                    date: rate["effectiveDate"],
                    bid: rate["bid"],
                    ask: rate["ask"]
                }))
            };
        }

        const response = await fetchNBP(`exchangerates/rates/c/${code.toLowerCase()}/`);

        if (response.status === 404) return error(404, {message: "Data not available"});

        return {
            code: code,
            rates: (await response.json())["rates"].map((rate: any) => ({
                date: rate["effectiveDate"],
                bid: rate["bid"],
                ask: rate["ask"]
            }))
        };
    }, {
        params: t.Object({
            code: t.String()
        }),
        query: t.Object({
            startDate: t.Optional(t.Date()),
            endDate: t.Optional(t.Date()),
            date: t.Optional(t.Date()),
        }),
        response: {
            200: 'currency',
            404: t.Object({
                message: t.String()
            })
        },
        detail: {
            tags: ['currency']
        }
    })