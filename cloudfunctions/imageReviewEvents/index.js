const cloud = require('wx-server-sdk');
const { imageReview } = require('./image-review');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const review = imageReview(cloud, cloud.database({ throwOnNotFound: false }));

exports.main = async event => {
    const { SOURCE } = cloud.getWXContext();
    // The function's cloud security rule also denies all client invocation.
    if (/(?:^|,)(?:wx_client|wx_devtools|wx_http)(?:,|$)/.test(SOURCE || '')) {
        throw Error('internal event required');
    }
    const now = Date.now();
    if (event?.Event === 'wxa_media_check') {
        await review.receive(event, now);
    } else {
        // The only other configured entry point is the timer. A cleanup call
        // uses server time and only touches expired records in this collection.
        const { overdue, expired } = await review.sweep(now);
        console.info('[image-review] cleanup checked', { overdue, expired });
    }
    return 'success';
};
