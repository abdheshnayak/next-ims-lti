import '@babel/polyfill';
import lti from 'ims-lti';
import bodyParser from 'body-parser';
import { useCookie as getCookie } from 'next-cookie';

require('@babel/polyfill');

const setMiddleware = (req, res) => {
  return new Promise((resolve) => {
    // @ts-ignore
    bodyParser.urlencoded({ extended: true })(req, res, () => {
      // @ts-ignore
      bodyParser.json()(req, res, () => {
        resolve({ req, res });
      });
    });
  });
};

const verifyLti = ({ ctx, request, key, secret, persist, cookieOptions }) => {
  return new Promise((resolve) => {
    // @ts-ignore
    const moodleData = new lti.Provider(key, secret);

    moodleData.valid_request(request, (err, isValid) => {
      const cookie = getCookie(ctx);
      if (!isValid) {
        if (persist) {
          cookie.set('ltiContext', JSON.stringify({}), {
            maxAge: 0,
            path: '/',
            ...cookieOptions,
          });
        }

        // console.error('not valid');
        resolve({});
      } else {
        if (persist) {
          cookie.set('ltiContext', JSON.stringify(moodleData.body), {
            maxAge: 1000 * 60 * 60 * 24 * 365,
            path: '/',
            ...cookieOptions,
          });
        }
        resolve(moodleData.body);
        // console.log('valid');
      }
    });
  });
};

const getLtiContext = async ({
  ctx,
  key,
  secret,
  persist,
  cookieOptions = {},
}) => {
  const { req, res } = ctx;

  if (req.method === 'POST') {
    const { req: request } = await setMiddleware(req, res);
    const lticontext = await verifyLti({
      ctx,
      request,
      key,
      secret,
      persist,
      cookieOptions,
    });
    return lticontext;
  }

  if (persist) {
    const cookie = getCookie(ctx);
    const ltiContext = cookie.get('ltiContext');
    return ltiContext || {};
  }

  const cookie = getCookie(ctx);
  cookie.set('ltiContext', JSON.stringify({}), {
    maxAge: 0,
    path: '/',
    ...cookieOptions,
  });

  return {};
};

export default getLtiContext;
