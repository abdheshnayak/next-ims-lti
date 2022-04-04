import '@babel/polyfill';
import lti from 'ims-lti';
import bodyParser from 'body-parser';
import { useCookie as getCookie } from 'next-cookie';

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

const toBase64 = (str) => {
  let _str;
  try {
    _str = Buffer.from(Buffer.from(str).toString('base64')).toString('base64');
    return _str;
  } catch (e) {
    return toBase64(JSON.stringify({ error: e }));
  }
};

const toNormalString = (str) => {
  let _str;
  try {
    _str = Buffer.from(
      Buffer.from(str, 'base64').toString(),
      'base64'
    ).toString();
    return _str;
  } catch (e) {
    return JSON.stringify({ error: e });
  }
};

const verifyLti = ({ ctx, request, key, secret, persist, cookieOptions }) => {
  return new Promise((resolve) => {
    // @ts-ignore
    const moodleData = new lti.Provider(key, secret);

    moodleData.valid_request(request, (err, isValid) => {
      const cookie = getCookie(ctx);
      if (!isValid) {
        if (persist) {
          const myb = toBase64(JSON.stringify({ error: err }));
          cookie.set('HEp8hAsCelpLI3EX', myb, {
            maxAge: 1000 * 60 * 60 * 24 * 365,
            path: '/',
            ...cookieOptions,
          });
        }

        // console.error(`not valid: ${err}`);
        resolve({ error: err });
      } else {
        if (persist) {
          const myb = toBase64(JSON.stringify(moodleData.body));
          cookie.set('HEp8hAsCelpLI3EX', myb, {
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
    try {
      const ltiContext = JSON.parse(
        toNormalString(cookie.get('HEp8hAsCelpLI3EX'))
      );

      return ltiContext || {};
    } catch (e) {
      return { error: e };
    }
  }

  const cookie = getCookie(ctx);
  const myb = toBase64(JSON.stringify({}));
  cookie.set('HEp8hAsCelpLI3EX', myb, {
    maxAge: 0,
    path: '/',
    ...cookieOptions,
  });

  return {};
};

export default getLtiContext;
