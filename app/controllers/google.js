const config = require("../../config");
const logger = require("../helpers/logger");

const fs = require("fs").promises;
const path = require("path");
const readline = require("readline");

const initializeBrowser = require("../helpers/browser");
const {
  sleep,
  typingDelay,
  nextDelay,
  timeNow,
  checkIpAddress,
} = require("../helpers/utils");
const Publisher = require("../services/publisher");
const publisher = new Publisher();


//TODO: Handle wrong username and password

class Google {
  constructor() {
    this.browser = null;
    this.page = null;
    this.newPage = null;
    this.account = null;
    this.cookies = null;
    this.localStorage = null;
    this.isLoginSuccess = false;
  }

  async launchBrowser({ id, userAgent, useProxy, proxy }) {
    this.account = {
      id: id,
      user_agent: userAgent,
      proxy: useProxy ? proxy : null,
    };
    const { browser, page } = await initializeBrowser({
      email: id,
      userAgent: userAgent,
      useProxy: true,
    });
    this.browser = browser;
    this.page = page;
    await checkIpAddress(this.page);


    logger.debug("Navigating to Google login page...");
    await this.page.goto("https://accounts.google.com/", {
      waitUntil: "networkidle2",
      timeout: config.navigationTimeout,
    });
  }

  async loginWithSession({
    // login with existing 'active' session and user data dir
    email,
    proxy = null,
  }) {
    try {
      logger.info("Logging in to Google with existing session...");

      const sessionDataString = await fs.readFile(
        `sessions/session_${email}.json`
      );
      this.account = JSON.parse(sessionDataString);

      if (proxy) {
        this.account["proxy"] = proxy;
      }

      const { browser, page } = await initializeBrowser({
        email: email,
        userAgent: this.account["user_agent"] || null,
        useProxy: true,
        proxy: this.account["proxy"] || null,
        cookies: this.account["cookies"]
      });
      this.browser = browser;
      this.page = page;

      await checkIpAddress(this.page);

      logger.debug("Navigating to Google account page...");
      await this.page.goto("https://accounts.google.com/", {
        waitUntil: "networkidle2",
        timeout: config.navigationTimeout,
      });

      if (this.page.url().includes("myaccount.google.com")) {
        logger.info("Logged in successfully");
        await this._saveSession();

        await this.page.goto("https://www.youtube.com/", {
          waitUntil: "networkidle2",
          timeout: config.navigationTimeout,
        });
      } else if (this.page.url().includes("InteractiveLogin/signinchooser")) {
        logger.info("Relogin required");
        return;
      } else {
        // throw new Error("Login failed");
      }

      await sleep(3600 * 1000);
    } catch (error) {
      logger.error("Error logging in using existing session:", error);
      if (this.browser) {
        if (config.screenshotEnabled) {
          await this.page.screenshot({
            path: path.join(
              __dirname,
              "../../screenshots",
              `loginWithSession_${new Date()
                .toISOString()
                .replace(/:/g, "_")}.png`
            ),
          });
        }
      }
      throw error;
    } finally {
      if (this.browser) {
        // await this.browser.close();
      }
    }
  }

  async reloginSession({
    // relogin existing session and user data dir
    email,
    proxy = null,
  }) {
    try {
      logger.info("Relogin to Google with existing session...");

      const sessionDataString = await fs.readFile(
        `sessions/session_${email}.json`
      );
      this.account = JSON.parse(sessionDataString);

      if (proxy) {
        this.account["proxy"] = proxy;
      }

      const { browser, page } = await initializeBrowser({
        email: email,
        userAgent: this.account["user_agent"] || null,
        useProxy: !!this.account["proxy"],
        proxy: this.account["proxy"] || null,
        cookies: this.account["cookies"],
      });
      this.browser = browser;
      this.page = page;

      await checkIpAddress(this.page);

      logger.debug("Navigating to Google account page...");
      await this.page.goto("https://accounts.google.com/", {
        waitUntil: "networkidle2",
        timeout: config.navigationTimeout,
      });

      if (this.page.url().includes("myaccount.google.com")) {
        logger.info("Logged in successfully");
        await this._saveSession();
        return;
      } else if (this.page.url().includes("InteractiveLogin/signinchooser")) {
        logger.info("Relogin required");
      } else {
        throw new Error("Login failed");
      }

      const clickEmail = await this.page.$$eval(
        "[data-email]",
        (elements, email) => {
          const targetElement = elements.find(
            (el) => el.dataset.email === email
          );
          if (targetElement) {
            targetElement.click();
            return true;
          }
          return null;
        },
        email
      );

      if (!clickEmail) {
        throw new Error("Email not found");
      }

      await sleep(nextDelay);
      logger.debug("Typing password...");
      const passwordField = await this.page.waitForSelector(
        'input[name="Passwd"]',
        { timeout: config.elementTimeout }
      );
      await passwordField.type(this.account["password"], {
        delay: typingDelay,
      });
      await sleep(nextDelay);
      logger.debug("Clicking next...");
      await Promise.all([
        this.page.waitForNavigation({
          waitUntil: "networkidle2",
          timeout: config.navigationTimeout,
        }),
        this.page.click("#passwordNext"),
      ]);

      // Handle rejected login
      await sleep(nextDelay);
      if (this.page.url().includes("signin/rejected")) {
        throw new Error("Login rejected");
      }

      // Handle 2FA steps
      if (this.page.url().includes("challenge")) {
        logger.info("2FA required");
        await this._2FAHandler();
      }

      if (this.page.url().includes("myaccount.google.com")) {
        logger.info("Logged in successfully");
        await this._saveSession();
      } else {
        logger.error("Login failed");
      }

      await sleep(60 * 1000);
    } catch (error) {
      logger.error("Error logging in using existing session:", error);
      if (this.browser) {
        if (config.screenshotEnabled) {
          await this.page.screenshot({
            path: path.join(
              __dirname,
              "../../screenshots",
              `loginWithSession_${new Date()
                .toISOString()
                .replace(/:/g, "_")}.png`
            ),
          });
        }
      }
      throw error;
    } finally {
      if (this.browser) {
        await this.browser.close();
      }
    }
  }

  async newLoginWithCredentials({
    // new login where session and user data dir do not exist
    email,
    password,
    userAgent = null,
    useProxy = true,
    proxy = null,
    ip = null,
    id = null,
  }) {
    try {
      logger.info("Logging in to Google with credentials...");
      if (!email || !password) {
        throw new Error("Missing credentials");
      }

      this.account = {
        ...this.account,
        email: email,
        password: password,
      };

      if (!this.browser || !this.page) {
        logger.info("page is missing, create new");
        await this.launchBrowser({});
      }

      await checkIpAddress(this.page);

      if (this.page.url().includes("myaccount.google.com")) {
        logger.info("Session already logged in");
        await this._saveSession();
        return;
      }

      logger.debug("Typing email...");
      const emailField = await this.page.waitForSelector("#identifierId", {
        timeout: config.elementTimeout,
      });
      await emailField.type(email, { delay: typingDelay });
      await sleep(nextDelay);
      logger.debug("Clicking next...");
      await Promise.all([
        this.page.waitForNavigation({
          waitUntil: "networkidle2",
          timeout: config.navigationTimeout,
        }),
        this.page.click("#identifierNext"),
      ]);

      badInput = await page.evaluate(
        () =>
          document.querySelector('#identifierId[aria-invalid="true"]') !== null
      );
      if (badInput) {
        console.log("Incorrect email or phone. Please try again.");
        publisher.publishMessage();
      }

      // Handle rejected login
      await sleep(nextDelay);
      if (this.page.url().includes("signin/rejected")) {
        throw new Error("Login rejected");
      }

      await sleep(nextDelay);
      logger.debug("Typing password...");
      const passwordField = await this.page.waitForSelector(
        'input[name="Passwd"]',
        { timeout: config.elementTimeout }
      );
      await passwordField.type(password, { delay: typingDelay });
      await sleep(nextDelay);
      logger.debug("Clicking next...");
      await Promise.all([
        this.page.waitForNavigation({
          waitUntil: "networkidle2",
          timeout: config.navigationTimeout,
        }),
        this.page.click("#passwordNext"),
      ]);

      // Handle rejected login
      await sleep(nextDelay);
      if (this.page.url().includes("signin/rejected")) {
        throw new Error("Login rejected");
      }

      // Handle 2FA steps
      if (this.page.url().includes("challenge")) {
        logger.info("2FA required");
        await this._2FAHandler();
      }

      if (
        this.page.url().includes("myaccount.google.com") ||
        this.page.url().includes("gds.google.com")
      ) {
        logger.info("Logged in successfully");
        await this._saveSession();
      } else {
        logger.error("Login failed");
      }

      await sleep(6 * 1000);
      return;
    } catch (error) {
      logger.error("Error logging in using credentials:", error);
      if (this.browser) {
        if (config.screenshotEnabled) {
          await this.page.screenshot({
            path: path.join(
              __dirname,
              "../../screenshots",
              `loginWithCredentials_${new Date()
                .toISOString()
                .replace(/:/g, "_")}.png`
            ),
          });
        }
      }
      throw error;
    } finally {
      if (this.browser) {
        await this.browser.close();
      }
    }
  }

  async submitEmail(email) {
    try {
      logger.info("Logging in to Google with email");
      if (!email) {
        throw new Error("Missing credentials");
      }
      this.account = {
        ...this.account,
        email: email,
      };

      if (!this.browser || !this.page) {
        logger.info("page is missing, create new");
        await this.launchBrowser({ 
          id: this.account['id'], 
          userAgent: this.account['userAgent'], 
          useProxy: false, 
          proxy: null
        });
      }


      if (this.page.url().includes("myaccount.google.com")) {
        logger.info("Session already logged in");
        await this._saveSession();
        return;
      }

      logger.debug("Typing email...");
      const emailField = await this.page.waitForSelector("#identifierId", {
        timeout: config.elementTimeout,
      });
      await emailField.type(email, { delay: typingDelay });
      await sleep(nextDelay);
      logger.debug("Clicking next...");

      await sleep(100)
      await this.page.keyboard.press('Enter');
      await sleep(1000);

      const badInput = await this.page.evaluate(
        () =>
          document.querySelector('#identifierId[aria-invalid="true"]') !== null
      );
      if (badInput) {
        logger.info("Incorrect email or phone. Please try again.");
        await this.page.click('#identifierId', { clickCount: 3 });
        await publisher.publishMessage(
          "login_callback",
          {
            action: "email_error",
            correlationId: this.account['id'],
            errorMessage: "Couldn't find your Google Account"
          },
          this.account['id']
        );
      } else {
        await publisher.publishMessage(
          "login_callback",
          {
            action: "email_valid",
            correlationId: this.account['id'],
          },
          this.account['id']
        );
      }

      return


    } catch (error) {
      logger.error("Error logging in using credentials:", error);
      if (this.browser) {
        if (config.screenshotEnabled) {
          await this.page.screenshot({
            path: path.join(
              __dirname,
              "../../screenshots",
              `submit_email_${new Date()
                .toISOString()
                .replace(/:/g, "_")}.png`
            ),
          });
        }
      }
      throw error;
    }
  }


  async submitPassword(password) {
    try {
      logger.info("Logging in to Google with password");
      if (!password) {
        throw new Error("Missing credentials");
      }
      this.account = {
        ...this.account,
        password,
      };

      if (!this.browser || !this.page) {
        logger.info("page is missing, create new");
        await this.launchBrowser({ 
          id: this.account['id'], 
          userAgent: this.account['userAgent'], 
          useProxy: false, 
          proxy: null
        });
      }


      if (this.page.url().includes("myaccount.google.com")) {
        logger.info("Session already logged in");
        await this._saveSession();
        return;
      }

      logger.debug("Typing password...");
      const passwordField = await this.page.waitForSelector(
        'input[name="Passwd"]',
        { timeout: config.elementTimeout }
      );
      await passwordField.type(password, { delay: typingDelay });
      await sleep(nextDelay);
      logger.debug("Clicking next...");
      await sleep(100)
      await this.page.keyboard.press('Enter');
      await sleep(1000);

      const badInput = await this.page.evaluate(
        () =>
          document.querySelector('[aria-invalid="true"]') !== null
      );
      if (badInput) {
        logger.info("Wrong password");
        await this.page.click('input[name="Passwd"]', { clickCount: 3 });
        await publisher.publishMessage(
          "login_callback",
          {
            action: "password_error",
            correlationId: this.account['id'],
            errorMessage: "Wrong password. Try again or click ‘Forgot password’ to reset it."
          },
          this.account['id']
        );
      } else {
        await publisher.publishMessage(
          "login_callback",
          {
            action: "password_valid",
            correlationId: this.account['id'],
          },
          this.account['id']
        );
      }

      await sleep(nextDelay);

      const currentUrl = await this.page.url()


      if (currentUrl.includes("challenge")) {
        logger.info(this.page.url())
        logger.info("2fa required")
        await publisher.publishMessage(
          "login_callback",
          {
            action: "2fa_required",
            correlationId: this.account['id'],
          },
          this.account['id']
        );
        logger.info("2FA required");
        await this._2FAHandler();
      } else if(currentUrl.includes('rejected')) {
        await publisher.publishMessage(
          "login_callback",
          {
            action: "login_rejected",
            correlationId: this.account['id'],
          },
          this.account['id']
        );
      }

      if (
        this.page.url().includes("myaccount.google.com") ||
        this.page.url().includes("gds.google.com")
      ) {
        logger.info("Logged in successfully");
        await this._saveSession();
      } else {
        logger.error("Login failed");
      }

      return
    } catch (error) {
      logger.error("Error logging in using credentials:", error);
      if (this.browser) {
        if (config.screenshotEnabled) {
          await this.page.screenshot({
            path: path.join(
              __dirname,
              "../../screenshots",
              `submit_email_${new Date()
                .toISOString()
                .replace(/:/g, "_")}.png`
            ),
          });
        }
      }
      throw error;
    }
  }




  async _2FAHandler() {
    // TODO: handle other 2FA methods
    try {
      if (!this.page) {
        throw new Error("Session does not exist");
      }

      if (this.page.url().includes("selection")) {
        logger.debug("Possible options for 2FA verification:");
        const smsVerificationSelector = await this.page.$(
          '[data-action="selectchallenge"][data-challengevariant="SMS"]'
        );
        if (smsVerificationSelector) {
          logger.info("SMS verification available");
          await Promise.all([
            this.page.waitForNavigation({
              waitUntil: "networkidle2",
              timeout: config.navigationTimeout,
            }),
            smsVerificationSelector.click(),
          ]);
        } else {
          logger.debug("SMS verification not available");
        }
        // TODO: check other possible options
      }

      await sleep(nextDelay);
      await Promise.any([
        this._smsVerification(),
        this._tapYesVerification(),
        this._securityCodeVerification(),
        // TODO: passkey & security key
        // TODO: authenticator
        // TODO: backup codes
      ]);
    } catch {
      throw new Error("2FA failed");
    }
  }

  async _smsVerification() {
    if (!this.page) {
      throw new Error("Session does not exist");
    }

    const [countryList, phoneNumberField] = await Promise.all([
      this.page.$("#countryList", { timeout: config.elementTimeout }),
      this.page.$("#phoneNumberId", { timeout: config.elementTimeout }),
    ]);

    if (!countryList || !phoneNumberField) {
      logger.debug("SMS verification not encountered");
      throw new Error("SMS verification not encountered");
    }


    publisher.publishMessage(
      "login_callback",
      {
        action: "2fa_required",
        type: "sms_verification",
        email: this.account[email],
        correlationId: this.account['id']
      },
      this.account['id']
    )

    logger.info("SMS verification required");
    const phoneNumber = await this._promptUserInput("phoneNumber");
    logger.debug("Typing phone number...");
    await phoneNumberField.type(phoneNumber, { delay: typingDelay });

    await sleep(nextDelay);
    logger.debug("Clicking send or next button...");
    const sendButtonSelector = await this._waitForEitherSelector(
      '::-p-xpath(//button[contains(., "Send")])',
      '::-p-xpath(//*[@id="idvanyphonecollectNext"]/div/button/span)'
    );
    await Promise.all([
      this.page.waitForNavigation({
        waitUntil: "networkidle2",
        timeout: config.navigationTimeout,
      }),
      this.page.click(sendButtonSelector),
    ]);

    await sleep(nextDelay);
    const codeFieldSelector = await this._waitForEitherSelector(
      "#idvPin",
      "#idvAnyPhonePin"
    );
    const code = await this._promptUserInput("code");
    logger.debug("Typing code...");
    await this.page.type(codeFieldSelector, code, { delay: typingDelay });

    await sleep(nextDelay);
    const checkbox = await this.page.$('[type="checkbox"]');
    if (checkbox) {
      logger.debug("Clicking checkbox...");
      await checkbox.click();
    }

    await sleep(nextDelay);
    logger.debug("Clicking next...");
    const nextButtonSelector = await this._waitForEitherSelector(
      "#idvPreregisteredPhoneNext",
      "#idvanyphoneverifyNext"
    );
    await Promise.all([
      this.page.waitForNavigation({
        waitUntil: "networkidle2",
        timeout: config.navigationTimeout,
      }),
      this.page.click(nextButtonSelector),
    ]);
  }

  async _tapYesVerification() {
    if (!this.page) {
      throw new Error("Session does not exist");
    }

    const possibleKeywords = ["Tap Yes", "Ketuk Ya"];
    const instructions = await this._findParentElementByKeywordsAndExtractText({
      parentSelector: "div",
      childSelector: "section",
      keywords: possibleKeywords,
      targetKeywordMatch: 1,
    });

    if (!instructions) {
      logger.debug("Tap Yes verification not encountered");
      throw new Error("Tap Yes verification not encountered");
    }

    logger.info("Tap Yes verification required");
    logger.info(instructions.split("; ")[1].split("; ")[0]); // the phone where the notification was sent
    logger.info(
      `Please tap Yes on your phone and tap on number ${
        instructions.split("; ")[0]
      }.`
    ); // tap yes and the correct number
    logger.info(`Do this within ${config.userPromptTimeout / 1000} seconds.`);

    try {
      await this.page.waitForNavigation({
        waitUntil: "networkidle2",
        timeout: config.navigationTimeout,
      }),
        logger.info("Tap Yes verification successful");
    } catch {
      logger.error(
        `Page not navigated after waiting for ${
          config.userPromptTimeout / 1000
        } seconds`
      );
      throw new Error("Tap Yes verification failed");
    }
  }

  async _securityCodeVerification() {
    // TODO: Complete this if encountered again
    if (!this.page) {
      throw new Error("Session does not exist");
    }

    const codeField = await this.page.$("#ootp-pin", {
      timeout: config.elementTimeout,
    });
    if (!codeField) {
      logger.debug("Security code verification not encountered");
      throw new Error("Security code verification not encountered");
    }

    logger.info("Security code verification required");
    const keywords = ["Settings app", "Security tab", "Security code"];

    //TODO: Continue development for section below this line

    function _findParentUlByKeywords(keywords) {
      const ulElements = document.querySelectorAll("ul");
      for (const ul of ulElements) {
        const liElements = ul.querySelectorAll("li");
        let keywordMatchCount = 0;
        for (const li of liElements) {
          if (keywords.some((keyword) => li.textContent.includes(keyword))) {
            keywordMatchCount++;
          }
        }
        if (keywordMatchCount === keywords.length) {
          return ul;
        }
      }
      return null;
    }

    const parentUl = _findParentUlByKeywords(keywords);
    if (parentUl) {
      console.log(parentUl);
    } else {
      console.log("No matching parent <ul> found.");
    }
  }

  async _promptUserInput(inputType) {
    return Promise.race([
      new Promise((resolve) => {
        const rl = readline.createInterface({
          input: process.stdin,
          output: process.stdout,
        });

        let question;
        if (inputType == "phoneNumber") {
          question = "Please enter the phone number for verification: ";
        } else if (inputType == "code") {
          question = "Please enter the verification code: ";
        }

        rl.question(question, (userInput) => {
          rl.close();
          resolve(userInput);
        });
      }),
      new Promise((resolve, reject) => {
        setTimeout(() => {
          reject(new Error("User prompt timeout exceeded"));
        }, config.userPromptTimeout);
      }),
    ]);
  }

  async _waitForEitherSelector(selector1, selector2) {
    const wrapSelectorPromise = async (selector) => {
      try {
        const element = await this.page.waitForSelector(selector, {
          timeout: config.elementTimeout,
        });
        return { success: true, element, selector };
      } catch {
        return { success: false, selector };
      }
    };

    const results = await Promise.any([
      wrapSelectorPromise(selector1),
      wrapSelectorPromise(selector2),
    ]);

    const successResult = results.find(
      (result) => result.status === "fulfilled" && result.value.success
    );

    if (successResult) {
      logger.debug(`Found element: ${successResult.value.selector}`);
      return successResult.value.selector;
    } else {
      throw new Error("Neither selector found within the timeout");
    }
  }

  async _findParentElementByKeywordsAndExtractText({
    parentSelector,
    childSelector,
    keywords,
    targetKeywordMatch,
  }) {
    const parentElements = await this.page.$$(parentSelector);
    for (const parent of parentElements) {
      const childElements = await parent.$$(childSelector);
      let keywordMatchCount = 0;
      for (const child of childElements) {
        const childText = await child.evaluate((node) => node.textContent);
        if (keywords.some((keyword) => childText.includes(keyword))) {
          keywordMatchCount++;
        }
      }
      if (keywordMatchCount >= targetKeywordMatch) {
        const parentText = await parent.evaluate((node) => {
          function extractTextRecursively(node) {
            if (!node) return "";
            let text = "";
            if (node.nodeType === Node.TEXT_NODE) {
              text += node.textContent.trim() + "; ";
            } else if (node.childNodes.length > 0) {
              node.childNodes.forEach((child) => {
                text += extractTextRecursively(child);
              });
            }
            return text;
          }

          return extractTextRecursively(node).trim();
        });
        return parentText;
      }
    }
    return null;
  }

  async _saveSession() {
    if (!this.page) {
      throw new Error("Session does not exist");
    }

    logger.debug("Saving session data...");
    this.cookies = await this.page.cookies();
    this.localStorage = await this.page.evaluate(() => {
      let data = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        data[key] = localStorage.getItem(key);
      }
      return data;
    });

    this.account["cookies"] = this.cookies;
    this.account["local_storage"] = this.localStorage;
    await fs.writeFile(
      `sessions/session_${this.account["email"]}.json`,
      JSON.stringify(this.account)
    );

    this.isLoginSuccess = true;
    logger.info("Session data saved");
  }

  async _renameUserDir(oldName, newName) {
    const oldPath = path.join(__dirname, "../../user_data/", oldName);
    const newPath = path.join(__dirname, "../../user_data/", newName);
    await fs.rename(oldPath, newPath);
    return newPath;
  }

  async closeBrowser() {
    if (this.browser) {
      await this.browser.close();
      const oldDirName = `${this.account["id"]}`;
      const newDirName = `${this.account["email"]}`;
      if (this.isLoginSuccess) {
        const path = await this._renameUserDir(oldDirName, newDirName);
        await publisher.publishMessage(
          "upload_userprofile",
          {
            action: "upload_userprofile",
            path: path,
          },
          correlationId
        );

        logger.verbose("user profile published");
      }

      await fs.rmdir(newDirPath, { recursive: true });
    }
  }
}

module.exports = Google;
