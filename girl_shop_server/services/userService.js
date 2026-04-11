const AppError = require("../utils/appError");
const { getNowString } = require("../utils/dateTime");
const { mutateDatabase, readDatabase } = require("./databaseService");
const { createAuthToken, hashText } = require("./securityService");

function createId(prefix) {
  return `${prefix}${Date.now()}${Math.floor(Math.random() * 1000)}`;
}

function serializeUser(user) {
  if (!user) {
    return null;
  }
  const { passwordHash, ...profile } = user;
  return profile;
}

function isValidPhone(phone) {
  return /^1\d{10}$/.test(phone);
}

function createUserAuth(user, sessionHours) {
  return createAuthToken(
    {
      tokenType: "user",
      userId: user.id,
      phone: user.phone,
    },
    sessionHours
  );
}

async function register(payload) {
  const phone = String(payload.phone || "").trim();
  const password = String(payload.password || "");
  const nickname = String(payload.nickname || "").trim();
  const email = String(payload.email || "").trim();
  const city = String(payload.city || "").trim();

  if (!phone || !password) {
    throw new AppError("请输入手机号和密码");
  }
  if (!isValidPhone(phone)) {
    throw new AppError("请输入正确的手机号");
  }
  if (password.length < 6) {
    throw new AppError("密码长度不能少于 6 位");
  }

  let registeredUser = null;
  let sessionHours = 12;
  let thrownError = null;
  const registerAt = getNowString();

  await mutateDatabase((database) => {
    sessionHours = Number(database.settings.sessionHours) || 12;
    const existingUserIndex = database.users.findIndex((user) => user.phone === phone);

    if (existingUserIndex !== -1) {
      const existingUser = database.users[existingUserIndex];
      if (existingUser.status !== "enabled") {
        thrownError = new AppError("当前账号已被禁用，请联系管理员", 403);
        return database;
      }
      if (existingUser.passwordHash) {
        thrownError = new AppError("该手机号已注册，请直接登录", 409);
        return database;
      }

      registeredUser = {
        ...existingUser,
        nickname: nickname || existingUser.nickname || `用户${phone.slice(-4)}`,
        phone,
        email: email || existingUser.email || "",
        city: city || existingUser.city || "",
        level: existingUser.level || "普通会员",
        status: existingUser.status || "enabled",
        totalSpent: Number(existingUser.totalSpent) || 0,
        orderCount: Number(existingUser.orderCount) || 0,
        registeredAt: existingUser.registeredAt || registerAt,
        lastLoginAt: registerAt,
        passwordHash: hashText(password),
      };
      database.users[existingUserIndex] = registeredUser;
      return database;
    }

    registeredUser = {
      id: createId("U"),
      nickname: nickname || `用户${phone.slice(-4)}`,
      phone,
      email,
      level: "普通会员",
      status: "enabled",
      city,
      totalSpent: 0,
      orderCount: 0,
      registeredAt: registerAt,
      lastLoginAt: registerAt,
      passwordHash: hashText(password),
    };
    database.users.push(registeredUser);
    return database;
  });

  if (thrownError) {
    throw thrownError;
  }

  const auth = createUserAuth(registeredUser, sessionHours);
  return {
    token: auth.token,
    expiresAt: auth.expiresAt,
    profile: serializeUser(registeredUser),
  };
}

async function login(payload) {
  const phone = String(payload.phone || "").trim();
  const password = String(payload.password || "");

  if (!phone || !password) {
    throw new AppError("请输入手机号和密码");
  }

  let currentUser = null;
  let sessionHours = 12;
  let thrownError = null;
  const loginAt = getNowString();

  await mutateDatabase((database) => {
    sessionHours = Number(database.settings.sessionHours) || 12;
    const userIndex = database.users.findIndex((user) => user.phone === phone);
    if (userIndex === -1) {
      thrownError = new AppError("账号或密码错误", 401);
      return database;
    }

    const user = database.users[userIndex];
    if (user.status !== "enabled") {
      thrownError = new AppError("当前账号已被禁用，请联系管理员", 403);
      return database;
    }
    if (!user.passwordHash) {
      thrownError = new AppError("当前账号尚未注册，请先完成注册", 401);
      return database;
    }
    if (user.passwordHash !== hashText(password)) {
      thrownError = new AppError("账号或密码错误", 401);
      return database;
    }

    currentUser = {
      ...user,
      lastLoginAt: loginAt,
    };
    database.users[userIndex] = currentUser;
    return database;
  });

  if (thrownError) {
    throw thrownError;
  }

  const auth = createUserAuth(currentUser, sessionHours);
  return {
    token: auth.token,
    expiresAt: auth.expiresAt,
    profile: serializeUser(currentUser),
  };
}

async function getProfile(userId) {
  const database = await readDatabase();
  const user = database.users.find((item) => item.id === userId);

  if (!user) {
    throw new AppError("用户不存在或登录已失效", 401);
  }
  if (user.status !== "enabled") {
    throw new AppError("当前账号已被禁用，请重新登录", 403);
  }

  return serializeUser(user);
}

module.exports = {
  getProfile,
  login,
  register,
};
