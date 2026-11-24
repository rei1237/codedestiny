import {fileURLToPath} from 'node:url';

export const starHugSessionPlugin = {
  name: 'original-star-hug-session',
  setup(build) {
    const source = relative => fileURLToPath(new URL(relative, import.meta.url));
    build.onResolve({filter: /^\.\/yeon-star-session\.mjs$/}, () => ({
      path: source('../service/yeon-star-session.mjs'),
    }));
    build.onResolve({filter: /step-controller\.mjs$/}, args =>
      args.importer === source('../service/yeon-star-session.mjs')
        ? {path: source('../../../lib/guided-flow/step-controller.mjs')}
        : null
    );
  },
};
