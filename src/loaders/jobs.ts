import { Container } from 'typedi'
import schedule from 'node-schedule'
import MessagingService from '../services/pushMessageService'
import AuthService from '../services/authService'

import { client } from './redis'
import {WinstonUtil} from "../utilz/winstonUtil";

export default () => {
    let logger = WinstonUtil.newLog('fcm');
    // 1. MESSAGE PROCESSING
    // Schedule message delivery for undelivered messages
    logger.info('-- 🛵 Scheduling Messaging Processing [Every 1 Min]')
    schedule.scheduleJob('*/1 * * * *', async function () {
        const messaging = Container.get(MessagingService)
        const taskName = 'Messages Processed'
        try {
            await messaging.batchProcessMessages()
            logger.info(`🐣 Cron Task Completed -- ${taskName}`)
        } catch (err) {
            logger.error(`❌ Cron Task Failed -- ${taskName}`)
            logger.error(`Error Object: %o`, err)
        }
    })

    // 2. DELETE STALE MESSAGES
    // This cron job deletes all the messages which could not be delivered after the max
    // attempts threshold hits, only after X days.
    logger.info('-- 🛵 Scheduling DELETE STALE MESSAGES Job [Every 12 Hours]')
    schedule.scheduleJob('* */12 * * *', async function () {
        const messaging = Container.get(MessagingService)
        const taskName = 'DELETE STALE MESSAGES'
        try {
            await messaging.deleteStaleMessages()
            logger.info(`🐣 Cron Task Completed -- ${taskName}`)
        } catch (err) {
            logger.error(`❌ Cron Task Failed -- ${taskName}`)
            logger.error(`Error Object: %o`, err)
        }
    })

    // 3. LATEST SERVICE UPTIME
    // This job updates redis with the latest uptime
    logger.info('-- 🛵 Scheduling LATEST SERVICE UPTIME [Every 10 Seconds]')
    schedule.scheduleJob('*/10 * * * * *', async function () {
        const taskName = 'LATEST SERVICE UPTIME'
        try {
            var uptimeKey =
                process.env.DELIVERY_NODES_NET + '_LATEST_SERVICE_UPTIME'
            await client.set(uptimeKey, Date.now().toString())
            //logger.debug(`🐣 Cron Task Completed -- ${taskName}`);
        } catch (err) {
            logger.error(`❌ Cron Task Failed -- ${taskName}`)
            logger.error(`Error Object: %o`, err)
        }
    })

    // 4. AUTH SERVICE
    // Schedule automatic deletion of servertokens
    logger.info(
        '-- 🛵 Scheduling automatic deletion of server tokens [Every 10 Mins]'
    )
    schedule.scheduleJob('*/10 * * * *', async function () {
        const auth = Container.get(AuthService)
        const taskName = 'Server Tokens Deleted'

        try {
            await auth.deleteExpiredServerTokens()
            logger.info(`🐣 Cron Task Completed -- ${taskName}`)
        } catch (err) {
            logger.error(`❌ Cron Task Failed -- ${taskName}`)
            logger.error(`Error Object: %o`, err)
        }
    })
}
