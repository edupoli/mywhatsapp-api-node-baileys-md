//
// Configuração dos módulos
const config = require('./config.global');
const fs = require("fs-extra");
const QRCode = require('qrcode');
const qrcodeterminal = require('qrcode-terminal');
const moment = require("moment");
const pino = require("pino");
const Base64BufferThumbnail = require('base64-buffer-thumbnail');
const {
  fromPath,
  fromBuffer,
  fromBase64
} = require('pdf2pic');
const {
  forEach
} = require('p-iteration');
const {
  default: makeWASocket,
  WASocket,
  AuthenticationState,
  BufferJSON,
  getMessage,
  WA_DEFAULT_EPHEMERAL,
  initInMemoryKeyStore,
  WAMessage,
  Contact,
  SocketConfig,
  useSingleFileAuthState,
  DisconnectReason,
  BaileysEventMap,
  GroupMetadata,
  AnyMessageContent,
  MiscMessageGenerationOptions,
  MessageType,
  MessageOptions,
  Mimetype,
  generateWAMessageFromContent,
  downloadContentFromMessage,
  downloadHistory,
  proto,
  generateWAMessageContent,
  prepareWAMessageMedia,
  WAUrlInfo
} = require('./Baileys/lib/index');
const colors = require('colors');
//
// ------------------------------------------------------------------------------------------------------- //
//
async function DataHora() {
  //
  let date_ob = new Date();

  // Data atual
  // Ajuste 0 antes da data de um dígito
  let date = ("0" + date_ob.getDate()).slice(-2);

  // Mês atual
  let month = ("0" + (date_ob.getMonth() + 1)).slice(-2);

  // Ano atual
  let year = date_ob.getFullYear();

  // Hora atual
  let hours = date_ob.getHours();

  // Minuto atual
  let minutes = date_ob.getMinutes();

  // Segundo atual
  let seconds = date_ob.getSeconds();

  // Imprime a data no formato AAAA-MM-DD
  console.log(year + "-" + month + "-" + date);

  // Imprime a data no formato DD/MM/YYYY
  console.log(date + "/" + month + "/" + year);

  // Imprime data e hora no formato AAAA-MM-DD HH:MM:SS
  console.log(year + "-" + month + "-" + date + " " + hours + ":" + minutes + ":" + seconds);

  // Imprime data e hora no formato DD/MM/YYYY HH:MM:SS
  console.log(date + "/" + month + "/" + year + " " + hours + ":" + minutes + ":" + seconds);

  // Imprime a hora no formato HH:MM:SS
  console.log(hours + ":" + minutes + ":" + seconds);
  //
  return date + "/" + month + "/" + year + " " + hours + ":" + minutes + ":" + seconds;
}
//
async function saudacao() {
  //
  var data = new Date();
  var hr = data.getHours();
  //
  if (hr >= 0 && hr < 12) {
    var saudacao = "Bom dia";
    //
  } else if (hr >= 12 && hr < 18) {
    var saudacao = "Boa tarde";
    //
  } else if (hr >= 18 && hr < 23) {
    var saudacao = "Boa noite";
    //
  } else {
    var saudacao = "---";
    //
  }
  return saudacao;
}
//
async function osplatform() {
  //
  var opsys = process.platform;
  if (opsys == "darwin") {
    opsys = "MacOS";
  } else if (opsys == "win32" || opsys == "win64") {
    opsys = "Windows";
  } else if (opsys == "linux") {
    opsys = "Linux";
  }
  console.log("- Sistema operacional", opsys) // I don't know what linux is.
  //console.log("-", os.type());
  //console.log("-", os.release());
  //console.log("-", os.platform());
  //
  return opsys;
}
//
// ------------------------------------------------------------------------------------------------------- //
//
async function updateStateDb(state, status, AuthorizationToken) {
  //
  const date_now = new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '');
  console.log("- Date:", date_now);
  //
  //
  const sql = "UPDATE tokens SET state=?, status=?, lastactivit=? WHERE token=?";
  const values = [state, status, date_now, AuthorizationToken];
  //
  if (parseInt(config.VALIDATE_MYSQL) == true) {
    const conn = require('./config/dbConnection').promise();
    const resUpdate = await conn.execute(sql, values);
    if (resUpdate) {
      console.log('- Status atualizado');
    } else {
      console.log('- Status não atualizado');
    }
  }
  //
}
//
// ------------------------------------------------------------------------------------------------------- //
//
async function deletaToken(filePath) {
  //
  fs.unlink(filePath, function(err) {
    if (err && err.code == 'ENOENT') {
      // file doens't exist
      console.log(`- Arquivo "${filePath}" não existe`);
    } else if (err) {
      // other errors, e.g. maybe we don't have enough permission
      console.log(`- Erro ao remover arquivo "${filePath}"`);
    } else {
      console.log(`- Arquivo "${filePath}" removido com sucesso`);
    }
  });
}
//
// ------------------------------------------------------------------------------------------------------- //
//
module.exports = class Sessions {
  //
  static async getStatusApi(sessionName, options = []) {
    Sessions.options = Sessions.options || options;
    Sessions.sessions = Sessions.sessions || [];

    var session = Sessions.getSession(sessionName);
    return session;
  } //getStatus
  //
  static async ApiStatus(SessionName) {
    console.log("- Status");
    var session = Sessions.getSession(SessionName);

    if (session) { //só adiciona se não existir
      if (session.state == "CONNECTED") {
        return {
          result: "info",
          state: session.state,
          status: session.status,
          message: "Sistema iniciado e disponivel para uso"
        };
      } else if (session.state == "STARTING") {
        return {
          result: "info",
          state: session.state,
          status: session.status,
          message: "Sistema iniciando e indisponivel para uso"
        };
      } else if (session.state == "QRCODE") {
        return {
          result: "warning",
          state: session.state,
          status: session.status,
          message: "Sistema aguardando leitura do QR-Code"
        };
      } else if (session.state == "CLOSED") {
        return {
          result: "info",
          state: session.state,
          status: session.status,
          message: "Sessão fechada"
        };
      } else {
        return {
          result: "warning",
          state: session.state,
          status: session.status,
          message: "Sistema iniciado e indisponivel para uso"
        };
      }
    } else {
      return {
        result: 'error',
        state: 'NOTFOUND',
        status: 'notLogged',
        message: 'Sistema Off-line'
      };
    }
  } //status
  //
  // ------------------------------------------------------------------------------------------------------- //
  //
  static async Start(SessionName, AuthorizationToken) {
    Sessions.sessions = Sessions.sessions || []; //start array

    var session = Sessions.getSession(SessionName, AuthorizationToken);

    if (session == false) {
      //create new session
      //
      session = await Sessions.addSesssion(SessionName, AuthorizationToken);
    } else if (["CLOSED"].includes(session.state) || ["DISCONNECTED"].includes(session.state)) {
      //restart session
      console.log("- State: CLOSED");
      session.state = "CLOSED";
      session.status = "notLogged";
      session.qrcode = null;
      session.qrcodedata = null;
      session.attempts = 0;
      session.message = "Sistema iniciando e indisponivel para uso";
      session.prossesid = null;
      session.blocklist = null;
      session.browserSessionToken = null;
      //
      console.log('- Nome da sessão:', session.name);
      console.log('- State do sistema:', session.state);
      console.log('- Status da sessão:', session.status);
      //
      session.client = Sessions.initSession(SessionName, AuthorizationToken);
      Sessions.setup(SessionName, AuthorizationToken);
    } else {
      console.log('- Nome da sessão:', session.name);
      console.log('- State do sistema:', session.state);
      console.log('- Status da sessão:', session.status);
    }
    //
    await updateStateDb(session.state, session.status, session.AuthorizationToken);
    //
    return session;
  } //start
  //
  // ------------------------------------------------------------------------------------------------------- //
  //
  static async addSesssion(SessionName, AuthorizationToken) {
    console.log("- Adicionando sessão");
    var newSession = {
      AuthorizationToken: AuthorizationToken,
      name: SessionName,
      processid: null,
      qrcode: null,
      qrcodedata: null,
      client: false,
      result: null,
      tokenPatch: null,
      state: 'STARTING',
      status: 'notLogged',
      message: 'Sistema iniciando e indisponivel para uso',
      attempts: 0,
      blocklist: null,
      browserSessionToken: null
    }
    Sessions.sessions.push(newSession);
    console.log("- Nova sessão: ", SessionName);

    //setup session
    newSession.client = Sessions.initSession(SessionName);
    Sessions.setup(SessionName);

    return newSession;
  } //addSession
  //
  // ------------------------------------------------------------------------------------------------//
  //
  static getSession(SessionName) {
    var foundSession = false;
    if (Sessions.sessions)
      Sessions.sessions.forEach(session => {
        if (SessionName == session.name) {
          foundSession = session;
        }
      });
    return foundSession;
  } //getSession
  //
  // ------------------------------------------------------------------------------------------------//
  //
  static getSessions() {
    if (Sessions.sessions) {
      return Sessions.sessions;
    } else {
      return [];
    }
  } //getSessions
  //
  // ------------------------------------------------------------------------------------------------------- //
  //
  static async initSession(SessionName) {
    console.log("- Iniciando sessão");
    var session = Sessions.getSession(SessionName);
    //
    //
    /*
        ╔═╗┌─┐┌┬┐┬┌─┐┌┐┌┌─┐┬    ╔═╗┬─┐┌─┐┌─┐┌┬┐┌─┐  ╔═╗┌─┐┬─┐┌─┐┌┬┐┌─┐┌┬┐┌─┐┬─┐┌─┐
        ║ ║├─┘ │ ││ ││││├─┤│    ║  ├┬┘├┤ ├─┤ │ ├┤   ╠═╝├─┤├┬┘├─┤│││├┤  │ ├┤ ├┬┘└─┐
        ╚═╝┴   ┴ ┴└─┘┘└┘┴ ┴┴─┘  ╚═╝┴└─└─┘┴ ┴ ┴ └─┘  ╩  ┴ ┴┴└─┴ ┴┴ ┴└─┘ ┴ └─┘┴└─└─┘
     */
    //
    console.log("- Saudação:", await saudacao());
    //
    console.log('- Nome da sessão:', SessionName);
    //
    console.log('- Folder Token:', config.TOKENSPATCH);
    //
    console.log("- AuthorizationToken:", session.AuthorizationToken);
    //
    //-------------------------------------------------------------------------------------------------------------------------------------//
    //
		/*
    if (fs.existsSync(`${config.TOKENSPATCH}/baileysmd-${SessionName}.data.json`)) {
      var configToken = require(`${config.TOKENSPATCH}/baileysmd-${SessionName}.data.json`);
      if (typeof configToken.creds.me.id !== undefined) {
        console.log('- ID da sessão do Whatsapp:', configToken.creds.me.id);
      } else {
        deletaToken(`${config.TOKENSPATCH}/baileysmd-${SessionName}.data.json`);
        //fs.unlinkSync(`baileysmd-${config.TOKENSPATCH}/${SessionName}.data.json`);
      }
    }
    const connect = () => {
      let status = undefined;
      try {
        const value = JSON.parse(fs.readFileSync(`${config.TOKENSPATCH}/baileysmd-${SessionName}.data.json`, {
          encoding: 'utf-8'
        }), BufferJSON.reviver);
        status = {
          creds: value.creds,
          keys: initInMemoryKeyStore(value.keys)
        };
      } catch {}
      return status;
    };

    const saveConnection = (status) => {
      status = status || (client === null || client === void 0 ? void 0 : client.authState);
      fs.writeFileSync(`${config.TOKENSPATCH}/baileysmd-${SessionName}.data.json`,
        JSON.stringify(status, BufferJSON.replacer, 2));
    };
		*/
    //
    // let client = undefined;
    //
    const {
      state,
      saveState
    } = useSingleFileAuthState(`${config.TOKENSPATCH}/baileysmd-${SessionName}.data.json`);
    //
    // https://github.com/adiwajshing/Baileys/issues/751
    //
    //const startSock = () => {
    console.log("- startSock".blue);
    const client = makeWASocket({
      /** provide an auth state object to maintain the auth state */
      auth: state,
      /** version to connect with */
      version: [2, 2146, 9],
      /** override browser config */
      browser: ['My-Whatsapp', 'Google Chrome', '96.00'],
      /** the WS url to connect to WA */
      waWebSocketUrl: 'wss://web.whatsapp.com/ws/chat',
      /** Fails the connection if the connection times out in this time interval or no data is received */
      connectTimeoutMs: 20000,
      /** ping-pong interval for WS connection */
      keepAliveIntervalMs: 25000,
      /** pino logger */
      logger: pino({
        level: 'silent'
      }),
      /** should the QR be printed in the terminal */
      printQRInTerminal: parseInt(config.VIEW_QRCODE_TERMINAL),
      //
      emitOwnEvents: true,
      /** Default timeout for queries, undefined for no timeout */
      defaultQueryTimeoutMs: undefined,
      /** proxy agent */
      agent: undefined,
      /** agent used for fetch requests -- uploading/downloading media */
      fetchAgent: undefined,
      /** 
       * fetch a message from your store 
       * implement this so that messages failed to send (solves the "this message can take a while" issue) can be retried
       * */
      getMessage: undefined
      //
    });
    //
    //return clientStart;
    // }
    //
    //client = await startSock();
    //
    /*
    client.ev.on('statusFind', async (status) => {
      //
      const {
        statusFind
      } = status;
      //
      if (statusFind == 'isConnected') {
        console.log("- statusFind isConnected".green);
        //
        session.state = "CONNECTED";
        session.status = 'isLogged';
        session.qrcodedata = null;
        session.message = 'Sistema iniciando e disponivel para uso';
        //
        await updateStateDb(session.state, session.status, session.AuthorizationToken);
        //
      } else if (statusFind == 'isDisconnected') {
        console.log("- statusFind isDisconnected".red);
        //
        session.state = "DISCONNECTED";
        session.status = 'notLogged';
        session.qrcodedata = null;
        session.message = "Sessão fechada";
        //
        await updateStateDb(session.state, session.status, session.AuthorizationToken);
        //
        //deletaToken(`${config.TOKENSPATCH}/baileysmd-${SessionName}.data.json`);
        //
        //client = await startSock();
        //Sessions.initSession(SessionName);
        //
      } else if (statusFind == 'notLogged') {
        console.log("- statusFind notLogged".red);
        //
        session.state = "CLOSED";
        session.status = 'notLogged';
        session.qrcodedata = null;
        session.message = "Sessão fechada";
        //
        await updateStateDb(session.state, session.status, session.AuthorizationToken);
        //
        //deletaToken(`${config.TOKENSPATCH}/baileysmd-${SessionName}.data.json`);
        //
      } else if (statusFind == 'tokenRemoved') {
        console.log("- statusFind tokenRemoved".yellow);
        //
        session.state = "CLOSED";
        session.status = 'notLogged';
        session.qrcodedata = null;
        session.message = "Sessão fechada";
        //
        await updateStateDb(session.state, session.status, session.AuthorizationToken);
        //
      } else if (statusFind == 'qrReadSuccess') {
        console.log("- statusFind qrReadSuccess".green);
        //
        session.state = "CONNECTED";
        session.status = 'isLogged';
        session.qrcodedata = null;
        session.message = 'Sistema iniciando e disponivel para uso';
        //
        await updateStateDb(session.state, session.status, session.AuthorizationToken);
        //
      } else if (statusFind == 'qrReadCode') {
        console.log("- statusFind qrReadCode".yellow);
        //
        session.state = "QRCODE";
        session.status = "qrRead";
        session.message = 'Sistema iniciando e indisponivel para uso';
        //
        await updateStateDb(session.state, session.status, session.AuthorizationToken);
        //
      } else if (statusFind == 'qrReadFail') {
        console.log("- statusFind qrReadFail".red);
        //
        session.state = "QRCODE";
        session.status = "qrRead";
        session.message = 'Sistema iniciando e indisponivel para uso';
        //
        await updateStateDb(session.state, session.status, session.AuthorizationToken);
        //
        //client = await startSock();
        //Sessions.initSession(SessionName);
        //
      } else {
        console.log(`- statusFind ${statusFind}`.yellow);
      }
      //
    });
		*/
    //
    let attempts = 0;
    //
    client.ev.on('connection.update', async (conn) => {
      //
      console.log("- Connection update".blue);
      //
      const {
        connection,
        lastDisconnect,
        isNewLogin,
        qr,
        receivedPendingNotifications
      } = conn;
      if (qr) {
        console.log('- QR Generated'.green);
        //
        var readQRCode = await QRCode.toDataURL(qr);
        var qrCode = readQRCode.replace('data:image/png;base64,', '');
        //
        attempts++;
        //
        console.log('- Número de tentativas de ler o qr-code:', attempts);
        session.attempts = attempts;
        //
        console.log("- Captura do QR-Code");
        //
        session.qrcode = readQRCode;
        session.qrcodedata = qrCode;
        //
        session.state = "QRCODE";
        session.status = "qrRead";
        session.message = 'Sistema iniciando e indisponivel para uso';
        //
      }
      if (attempts <= 3) {
        await updateStateDb(session.state, session.status, session.AuthorizationToken);
      }
      //
      if (connection === 'connecting') {
        console.log(`- Connection ${connection}`.green);
        //
        session.state = "STARTING";
        session.status = 'notLogged';
        session.qrcodedata = null;
        session.message = 'Sistema iniciando e indisponivel para uso';
        //
        await updateStateDb(session.state, session.status, session.AuthorizationToken);
        //
      } else if (connection === 'open') {
        console.log("- Connection open".green);
        //
        session.state = "CONNECTED";
        session.status = 'isLogged';
        session.qrcodedata = null;
        session.message = 'Sistema iniciando e disponivel para uso';
        //
        await updateStateDb(session.state, session.status, session.AuthorizationToken);
        //
      } else if (connection === 'close') {
        console.log("- Connection close".red);
        console.log(`- Output: \n ${JSON.stringify(lastDisconnect?.error.output)}`);
        console.log(`- Data: \n ${JSON.stringify(lastDisconnect?.error.data)}`);
        console.log(`- loggedOut: \n ${JSON.stringify(DisconnectReason.loggedOut)}`);
        // reconnect if not logged out
        if (lastDisconnect?.error.output.statusCode !== DisconnectReason?.loggedOut) {
          //
          //client = await startSock();
          //
          Sessions.initSession(SessionName);
          //
        } else if (lastDisconnect?.error.output.statusCode === DisconnectReason?.loggedOut) {
          //
          session.state = "CLOSED";
          session.status = 'notLogged';
          session.qrcodedata = null;
          session.message = "Sessão fechada";
          //
          deletaToken(`${config.TOKENSPATCH}/baileysmd-${SessionName}.data.json`);
          //
          await updateStateDb(session.state, session.status, session.AuthorizationToken);
          //
          //client = await startSock();
          //
          Sessions.initSession(SessionName);
          //
        } else {
          console.log("- Connection close".red);
          //
          session.state = "CLOSED";
          session.status = 'notLogged';
          session.qrcodedata = null;
          session.message = "Sessão fechada";
          //
        }
        //
      } else if (typeof connection === undefined) {
        console.log("- Connection undefined".red);
      }
      //
      //console.log('Connection Update: ', conn);
      //
    });
    //
    // auto save dos dados da sessão
    client.ev.on("creds.update", saveState);
    //
    return client;
  } //initSession
  //
  // ------------------------------------------------------------------------------------------------//
  //
  /*
    ╔═╗┌─┐┌┬┐┌┬┐┬┌┐┌┌─┐  ┌─┐┌┬┐┌─┐┬─┐┌┬┐┌─┐┌┬┐
    ║ ╦├┤  │  │ │││││ ┬  └─┐ │ ├─┤├┬┘ │ ├┤  ││
    ╚═╝└─┘ ┴  ┴ ┴┘└┘└─┘  └─┘ ┴ ┴ ┴┴└─ ┴ └─┘─┴┘
  */
  //
  static async setup(SessionName) {
    console.log("- Sinstema iniciando");
    var session = Sessions.getSession(SessionName);
    await session.client.then(async (client) => {
      //
      /** set chats (history sync), messages are reverse chronologically sorted */
      client.ev.on('chats.set', async (e) => {
        const {
          chats,
          messages
        } = e;
        console.log('- Sessão:', SessionName);
        console.log(`- Chats set ${chats}, messages ${messages}`)
      });
      //
      /** upsert chats */
      client.ev.on('chats.upsert', async (chats) => {
        console.log('- Sessão:', SessionName);
        console.log(`- Chats upsert ${chats}`);
      });
      //
      /** update the given chats */
      client.ev.on('chats.update', async (chats) => {
        console.log('- Sessão:', SessionName);
        console.log(`- Chats update ${JSON.stringify(chats)}`);
      });
      //
      /** delete chats with given ID */
      client.ev.on('chats.delete', async (chats) => {
        console.log('- Sessão:', SessionName);
        console.log(`- Chats delete: ${chats}`);
      });
      //
      /** presence of contact in a chat updated */
      client.ev.on('presence.update', async (update) => {
        const {
          id,
          presences
        } = update;
        console.log('- Sessão:', SessionName);
        console.log(`- Presence update ID ${JSON.stringify(id)}, presences ${JSON.stringify(presences)} `);
      });
      //
      client.ev.on('contacts.upsert', async (contacts) => {
        console.log('- Sessão:', SessionName);
        console.log(`- Contacts upsert: ${JSON.stringify(contacts)}`);
      });
      //
      client.ev.on('contacts.update', async (contacts) => {
        console.log('- Sessão:', SessionName);
        console.log(`- Contacts update: ${JSON.stringify(contacts)}`);
      });
      //
      /** 
       * add/update the given messages. If they were received while the connection was online, 
       * the update will have type: "notify"
       *  */
      client.ev.on('messages.upsert', async (m) => {
        console.log('- Sessão:', SessionName);
        console.log(`- Messages upsert replying to: ${m.messages[0].key.remoteJid}`);
        //
        /*
        const msg = m.messages[0]
        if (!msg.key.fromMe && m.type === 'notify') {
          console.log('- Respondendo: ', msg.key.remoteJid);
          await client.sendReadReceipt(msg.key.remoteJid, msg.key.participant, [msg.key.id]);
          await client.sendMessage(msg.key.remoteJid, {
            text: 'Opa! WABaseMD funcionando!'
          });
        }
				*/
        //
      });
      //
      client.ev.on('message-info.update', async (message) => {
        console.log('- Sessão:', SessionName);
        console.log(`- Message-info update: ${message}`);
      });
      //
      client.ev.on('groups.update', async (group) => {
        console.log('- Sessão:', SessionName);
        console.log(`- Grupo update: ${group}`);
      });
      //
      /** apply an action to participants in a group */
      client.ev.on('group-participants.update', async (group) => {
        const {
          id,
          participants,
          action
        } = group;
        console.log('- Sessão:', SessionName);
        switch (action) {
          case 'add':
            console.log('- Participante(s) adicionado(s): ', participants);
            break;
          case 'remove':
            console.log('- Participante(s) removido(s): ', participants);
            break;
          case 'promote':
            console.log('- Participante(s) promovido(s) a admin: ', participants);
            break;
          case 'demote':
            console.log('- Participante(s) despromovido(s) de admin: ', participants);
            break;
          default:
            console.log('- Ação não tratada');
            break;
        }
        //
        client.ev.on('blocklist.set', async (blocklist) => {
          console.log('- Sessão:', SessionName);
          console.log(`- Slocklist set: ${blocklist}`);
          session.blocklist = JSON.stringify(blocklist, null, 2);
        });
        //
        client.ev.on('blocklist.update', async (blocklist) => {
          console.log('- Sessão:', SessionName);
          console.log(`- Slocklist update: ${blocklist}`);
          session.blocklist = JSON.stringify(blocklist, null, 2);
        });
        //
      });
      //
    });
  } //setup
  //
  // ------------------------------------------------------------------------------------------------//
  //
  static async logoutSession(SessionName) {
    console.log("- Fechando sessão");
    var session = Sessions.getSession(SessionName);
    var LogoutSession = await session.client.then(async client => {
      try {
        await client.logout();
        //
        var returnLogout = {
          result: "success",
          state: session.state,
          status: session.status,
          message: "Sessão desconetada"
        };
        //
        session.state = "DISCONNECTED";
        session.status = 'CLOSED';
        console.log("- Sessão desconetada");
        //
        await deletaToken(`${config.TOKENSPATCH}/baileysmd-${SessionName}.data.json`);
        //
        await updateStateDb(session.state, session.status, session.AuthorizationToken);
        //
        return returnLogout;
        //
      } catch (error) {
        //console.log("- Erro ao desconetar sessão:", error);
        //
        return {
          result: "error",
          state: session.state,
          status: session.status,
          message: "Erro ao desconetar sessão"
        };
        //
      };
    });
    //
    await updateStateDb(session.state, session.status, session.AuthorizationToken);
    //
    return LogoutSession;
  } //LogoutSession
  //
  //
  // ------------------------------------------------------------------------------------------------------- //
  //
  /*
  ╔╗ ┌─┐┌─┐┬┌─┐  ╔═╗┬ ┬┌┐┌┌─┐┌┬┐┬┌─┐┌┐┌┌─┐  ┬ ┬┌─┐┌─┐┌─┐┌─┐
  ╠╩╗├─┤└─┐││    ╠╣ │ │││││   │ ││ ││││└─┐  │ │└─┐├─┤│ ┬├┤ 
  ╚═╝┴ ┴└─┘┴└─┘  ╚  └─┘┘└┘└─┘ ┴ ┴└─┘┘└┘└─┘  └─┘└─┘┴ ┴└─┘└─┘
  */
  //
  // ------------------------------------------------------------------------------------------------//
  //
  // Enviar Contato
  static async sendContactVcard(
    SessionName, number, contact, namecontact
  ) {
    console.log("- Enviando contato.");
    //
    var session = Sessions.getSession(SessionName);
    var sendResult = await session.client.then(async client => {
      // Send contact
      const vcard = 'BEGIN:VCARD\n' // metadata of the contact card
        +
        'VERSION:3.0\n' +
        'FN:' + namecontact + '\n' // full name
        +
        'ORG:Home;\n' // the organization of the contact
        +
        'TEL;type=CELL;type=VOICE;waid=' + contact + ':+' + contact + '\n' // WhatsApp ID + phone number
        +
        'END:VCARD'
      //
      return await client.sendMessage(number, {
        contacts: {
          displayName: namecontact,
          contacts: [{
            vcard
          }]
        }
      }).then((result) => {
        //console.log('Result: ', result); //return object success
        //
        return {
          "erro": false,
          "status": 200,
          "message": "Contato enviado com sucesso."
        };
        //
      }).catch((erro) => {
        console.error('Error when sending: ', erro); //return object error
        //
        return {
          "erro": true,
          "status": 404,
          "message": "Erro ao enviar contato"
        };
        //
      });
    });
    return sendResult;
  } //sendContactVcard

  //
  // ------------------------------------------------------------------------------------------------//
  //
  //Enviar Texto
  static async sendText(
    SessionName,
    number,
    msg
  ) {
    console.log("- Enviando menssagem de texto.");
    var session = Sessions.getSession(SessionName);
    var sendResult = await session.client.then(async client => {
      // send a simple text!
      return await client.sendMessage(number, {
        text: msg
      }).then((result) => {
        //console.log("Result: ", result); //return object success
        //
        return {
          "erro": false,
          "status": 200,
          "group": number,
          "message": "Menssagem enviada com sucesso."
        };
        //
      }).catch((erro) => {
        console.error("Error when sending: ", erro); //return object error
        return {
          "erro": true,
          "status": 404,
          "group": number,
          "message": "Erro ao enviar menssagem"
        };
        //
      });
    });
    return sendResult;
  } //sendText
  //
  // ------------------------------------------------------------------------------------------------//
  //
  //Enviar localização
  static async sendLocation(
    SessionName,
    number,
    lat,
    long,
    caption
  ) {
    console.log("- Enviando localização.");
    var session = Sessions.getSession(SessionName);
    var sendResult = await session.client.then(async client => {
      //
      var options = {
        caption: caption,
        detectLinks: true
      };
      //
      return await client.sendMessage(number, {
        location: {
          degreesLatitude: lat,
          degreesLongitude: long
        }
      }, options).then((result) => {
        //console.log("Result: ", result); //return object success
        //
        return {
          "erro": false,
          "status": 200,
          "message": "Localização enviada com sucesso."
        };
        //
      }).catch((erro) => {
        console.error("Error when sending: ", erro); //return object error
        //return { result: 'error', state: session.state, message: "Erro ao enviar menssagem" };
        //return (erro);
        //
        return {
          "erro": true,
          "status": 404,
          "message": "Erro ao enviar localização."
        };
        //
      });
    });
    return sendResult;
  } //sendLocation
  //
  // ------------------------------------------------------------------------------------------------//
  //
  //Enviar links com preview
  static async sendLinkPreview(
    SessionName, number, link, caption
  ) {
    console.log("- Enviando link.");
    var session = Sessions.getSession(SessionName);
    var sendResult = await session.client.then(async client => {
      //
      var options = {
        caption: caption,
        detectLinks: true
      };
      //
      return await client.sendMessage(number, link, MessageType.text, options).then((result) => {
        //console.log("Result: ", result); //return object success
        //
        return {
          "erro": false,
          "status": 200,
          "message": "Link enviada com sucesso."
        };
        //
      }).catch((erro) => {
        console.error("Error when sending: ", erro); //return object error
        //return { result: 'error', state: session.state, message: "Erro ao enviar menssagem" };
        //return (erro);
        //
        return {
          "erro": true,
          "status": 404,
          "message": "Erro ao enviar link."
        };
        //
      });
    });
    return sendResult;
  } //sendLinkPreview
  //
  // ------------------------------------------------------------------------------------------------//
  //
  //Enviar Imagem
  static async sendImage(
    SessionName,
    from,
    buffer,
    mimetype,
    originalname,
    caption
  ) {
    console.log("- Enviando menssagem com imagem.");
    var session = Sessions.getSession(SessionName);
    var resultsendImage = await session.client.then(async (client) => {
      //
      let mime = '';
      mime = mimetype;
      if (mime.split("/")[1] === "gif") {
        return await client.sendMessage(from, {
          video: buffer,
          caption: caption,
          gifPlayback: true
        });
      } else if (mime.split("/")[0] === "image") {
        return await client.sendMessage(from, {
          image: buffer,
          jpegThumbnail: buffer,
          mimetype: mimetype,
          fileName: originalname,
          caption: caption
        }).then((result) => {
          //console.log('Result: ', result); //return object success
          //return (result);
          //
          return {
            "erro": false,
            "status": 200,
            "message": "Arquivo enviado com sucesso."
          };
          //
        }).catch((erro) => {
          console.error('Error when sending: ', erro); //return object error
          //return (erro);
          //
          return {
            "erro": true,
            "status": 404,
            "message": "Erro ao enviar arquivo"
          };
          //
        });
      }
      //
    });
    return resultsendImage;
  } //sendImage
  //
  // ------------------------------------------------------------------------------------------------//
  //
  //Enviar arquivo
  static async sendFile(
    SessionName,
    from,
    buffer,
    mimetype,
    originalname,
    fileExtension,
    caption
  ) {
    console.log("- Enviando arquivo", fileExtension);
    var session = Sessions.getSession(SessionName);
    var sendFile = await session.client.then(async (client) => {
      //
      let mime = '';
      mime = mimetype;
      if (mime.split("/")[1] === "gif") {
        return await client.sendMessage(from, {
          video: buffer,
          caption: caption,
          gifPlayback: true
        }).then((result) => {
          //console.log('Result: ', result); //return object success
          //return (result);
          //
          return {
            "erro": false,
            "status": 200,
            "message": "Arquivo enviado com sucesso."
          };
          //
        }).catch((erro) => {
          console.error('Error when sending: ', erro); //return object error
          //return (erro);
          //
          return {
            "erro": true,
            "status": 404,
            "message": "Erro ao enviar arquivo"
          };
          //
        });
      } else if (mime.split("/")[0] === "image") {
        return await client.sendMessage(from, {
          image: buffer,
          mimetype: mimetype,
          fileName: originalname,
          caption: caption
        }).then((result) => {
          //console.log('Result: ', result); //return object success
          //return (result);
          //
          return {
            "erro": false,
            "status": 200,
            "message": "Arquivo enviado com sucesso."
          };
          //
        }).catch((erro) => {
          console.error('Error when sending: ', erro); //return object error
          //return (erro);
          //
          return {
            "erro": true,
            "status": 404,
            "message": "Erro ao enviar arquivo"
          };
          //
        });
      } else if (mime.split("/")[0] === "video") {
        return await client.sendMessage(from, {
          video: buffer,
          caption: caption
        }).then((result) => {
          //console.log('Result: ', result); //return object success
          //return (result);
          //
          return {
            "erro": false,
            "status": 200,
            "message": "Arquivo enviado com sucesso."
          };
          //
        }).catch((erro) => {
          console.error('Error when sending: ', erro); //return object error
          //return (erro);
          //
          return {
            "erro": true,
            "status": 404,
            "message": "Erro ao enviar arquivo"
          };
          //
        });
      } else if (mime.split("/")[0] === "audio") {
        return await client.sendMessage(from, {
          audio: buffer,
          caption: caption,
          mimetype: 'audio/mpeg'
        }).then((result) => {
          //console.log('Result: ', result); //return object success
          //return (result);
          //
          return {
            "erro": false,
            "status": 200,
            "message": "Arquivo enviado com sucesso."
          };
          //
        }).catch((erro) => {
          console.error('Error when sending: ', erro); //return object error
          //return (erro);
          //
          return {
            "erro": true,
            "status": 404,
            "message": "Erro ao enviar arquivo"
          };
          //
        });
      } else if (mime.split("/")[1] === "pdf") {
        return await client.sendMessage(from, {
          document: buffer,
          jpegThumbnail: buffer,
          mimetype: mimetype,
          fileName: originalname,
          caption: caption
        }).then((result) => {
          //console.log('Result: ', result); //return object success
          //return (result);
          //
          return {
            "erro": false,
            "status": 200,
            "message": "Arquivo enviado com sucesso."
          };
          //
        }).catch((erro) => {
          console.error('Error when sending: ', erro); //return object error
          //return (erro);
          //
          return {
            "erro": true,
            "status": 404,
            "message": "Erro ao enviar arquivo"
          };
          //
        });
      } else {
        return await client.sendMessage(from, {
          document: buffer,
          mimetype: mimetype,
          fileName: originalname,
          caption: caption
        }).then((result) => {
          //console.log('Result: ', result); //return object success
          //return (result);
          //
          return {
            "erro": false,
            "status": 200,
            "message": "Arquivo enviado com sucesso."
          };
          //
        }).catch((erro) => {
          console.error('Error when sending: ', erro); //return object error
          //return (erro);
          //
          return {
            "erro": true,
            "status": 404,
            "message": "Erro ao enviar arquivo"
          };
          //
        });
      }
      //
    });
    return sendFile;
  } //sendFile
  //
  // ------------------------------------------------------------------------------------------------//
  //
  /*
  ╦═╗┌─┐┌┬┐┬─┐┬┌─┐┬  ┬┬┌┐┌┌─┐  ╔╦╗┌─┐┌┬┐┌─┐                
  ╠╦╝├┤  │ ├┬┘│├┤ └┐┌┘│││││ ┬   ║║├─┤ │ ├─┤                
  ╩╚═└─┘ ┴ ┴└─┴└─┘ └┘ ┴┘└┘└─┘  ═╩╝┴ ┴ ┴ ┴ ┴                
  */
  //
  // Recuperar contatos
  static async getAllContacts(
    SessionName
  ) {
    console.log("- Obtendo todos os contatos!");
    //
    var session = Sessions.getSession(SessionName);
    var resultgetAllContacts = await session.client.then(async client => {
      try {
        //console.log('Result: ', result); //return object success
        //
        /*
        //
        await forEach(result, async (resultAllContacts) => {
          var tableName = resultAllContacts.jid;
          console.log(tableName);
        });
        //
				*/
        /*
				var getChatGroupNewMsg = [];

        await forEach(result, async (resultAllContacts) => {
          //
          //if (resultAllContacts.isMyContact === true || resultAllContacts.isMyContact === false && resultAllContacts.isUser === true) {
          //
          getChatGroupNewMsg.push({
            "user": resultAllContacts.jid,            
						"name": resultAllContacts.name,            
						"shortName": resultAllContacts.short,            
						"pushname": resultAllContacts.notify,            
						"formattedName": resultAllContacts.vname,            
						"isMyContact": resultAllContacts.verify,            
						"isWAContact": '',            
						"isBusiness": ''
          });
          //}
          //
        });
				*/
        //
        //return result;
        //
      } catch (erro) {
        console.error('Error when sending: ', erro); //return object error
        //
        return {
          "erro": true,
          "status": 404,
          "message": "Erro ao recuperar contatos"
        };
        //
      };
      //
    });
    //
    return resultgetAllContacts;
  } //getAllContacts
  //
  // ------------------------------------------------------------------------------------------------//
  //
  // Recuperar grupos
  static async getAllGroups(
    SessionName
  ) {
    console.log("- Obtendo todos os grupos");
    //
    var session = Sessions.getSession(SessionName);
    var resultgetAllGroups = await session.client.then(async client => {
      //
      return await client.groupFetchAllParticipating().then(async (result) => {
        //console.log('Result: ', result); //return object success
        let groups = Object.entries(result).slice(0).map(entry => entry[1]);
        //
        var getAllGroups = [];
        //
        await forEach(groups, async (resultAllContacts) => {
          //
          if (resultAllContacts.desc && resultAllContacts.desc != undefined) {
            var buffer = Buffer.from(resultAllContacts.desc);
            var desc = buffer.toString();
          } else {
            var desc = null;
          }
          //
          if (resultAllContacts.descId && resultAllContacts.descId != undefined) {
            var descId = resultAllContacts.descId
          } else {
            var descId = null;
          }
          //
          getAllGroups.push({
            "groupId": resultAllContacts.id.replace('@g.us', ''),
            "name": resultAllContacts.subject,
            "desc": desc,
            "descId": descId,
          });
          //
        });
        //
        return getAllGroups;
        //
      }).catch((erro) => {
        console.error('Error when sending: ', erro); //return object error
        //
        return {
          "erro": true,
          "status": 404,
          "message": "Erro ao recuperar nome dos grupos"
        };
        //
      });
      //
    });
    //
    return resultgetAllGroups;
  } //getAllGroups
  //
  // ------------------------------------------------------------------------------------------------//
  //
  // Chama sua lista de contatos bloqueados
  static async getBlockList(SessionName) {
    console.log("- getBlockList");
    var session = Sessions.getSession(SessionName);
    var resultgetBlockList = await session.client.then(async client => {
      try {
        var result = session.blocklist;
        //console.log('Result: ', result); //return object success
        return result;
      } catch (erro) {
        console.error('Error when sending: ', erro); //return object error
        //
        return {
          "erro": true,
          "status": 404,
          "message": "Erro ao recuperar lista de contatos bloqueados"
        };
        //
      };
    });
    return resultgetBlockList;
  } //getBlockList
  //
  // ------------------------------------------------------------------------------------------------//
  //
  // Recuperar status de contato
  static async getStatus(
    SessionName, number
  ) {
    console.log("- Obtendo status!");
    var session = Sessions.getSession(SessionName);
    var resultgetStatus = await session.client.then(async client => {
      return await client.fetchStatus(number).then((result) => {
        //console.log('Result: ', result); //return object success
        return result;
      }).catch((erro) => {
        console.error('Error when sending:\n', erro); //return object error
        //
        return {
          "erro": true,
          "status": 404,
          "message": "Erro ao recuperar status de contato"
        };
        //
      });
    });
    return resultgetStatus;
  } //getStatus
  //
  // ------------------------------------------------------------------------------------------------//
  //
  // Recuperar status de contato
  static async getNumberProfile(
    SessionName, number
  ) {
    console.log("- Obtendo status!");
    var session = Sessions.getSession(SessionName);
    var resultgetNumberProfile = await session.client.then(async client => {
      return await client.getNumberProfile(number).then((result) => {
        //console.log('Result: ', result); //return object success
        return result;
      }).catch((erro) => {
        console.error('Error when sending:\n', erro); //return object error
        //
        return {
          "erro": true,
          "status": 404,
          "message": "Erro ao recuperar profile"
        };
        //
      });
    });
    return resultgetNumberProfile;
  } //getStatus
  //
  // ------------------------------------------------------------------------------------------------//
  //
  // Obter a foto do perfil do servidor
  static async getProfilePicFromServer(
    SessionName,
    number
  ) {
    console.log("- Obtendo a foto do perfil do servidor!");
    var session = Sessions.getSession(SessionName);
    var resultgetProfilePicFromServer = await session.client.then(async client => {
      return await client.profilePictureUrl(number).then((result) => {
        //console.log('Result: ', result); //return object success
        return {
          "url": result
        };
      }).catch((erro) => {
        console.error('Error when sending:\n', erro); //return object error
        //
        return {
          "erro": true,
          "status": 404,
          "message": "Erro ao obtendo a foto do perfil no servidor"
        };
        //
      });
    });
    return resultgetProfilePicFromServer;
  } //getProfilePicFromServer
  //
  // ------------------------------------------------------------------------------------------------//
  //
  // Verificar o status do número
  static async checkNumberStatus(
    SessionName,
    number
  ) {
    console.log("- canReceiveMessage");
    var session = Sessions.getSession(SessionName);
    var resultcheckNumberStatus = await session.client.then(async client => {
      //
      return await client.onWhatsApp(number).then(([result]) => {
        //console.log('Result:\n', result); //return object success
        //
        if (result.exists) {
          //
          return {
            "erro": false,
            "status": 200,
            "number": result.jid,
            "message": "O número informado pode receber mensagens via whatsapp"
          };
          //
        } else if (!result.exists) {
          //
          return {
            "erro": true,
            "status": 404,
            "number": result.jid,
            "message": "O número informado não pode receber mensagens via whatsapp"
          };
          //
        } else {
          //
          return {
            "erro": true,
            "status": 404,
            "message": "Erro ao verificar número informado"
          };
          //
        }
      }).catch((erro) => {
        console.error('Error when sending:\n', erro); //return object error
        //
        return {
          "erro": true,
          "status": 404,
          "message": "Erro ao verificar número informado"
        };
        //
      });
    });
    return resultcheckNumberStatus;
  } //checkNumberStatus
  //
  // ------------------------------------------------------------------------------------------------//
  //
  /*
  ╔═╗┬─┐┌─┐┬ ┬┌─┐  ╔═╗┬ ┬┌┐┌┌─┐┌┬┐┬┌─┐┌┐┌┌─┐               
  ║ ╦├┬┘│ ││ │├─┘  ╠╣ │ │││││   │ ││ ││││└─┐               
  ╚═╝┴└─└─┘└─┘┴    ╚  └─┘┘└┘└─┘ ┴ ┴└─┘┘└┘└─┘               
  */
  //
  // Deixar o grupo
  static async leaveGroup(
    SessionName, groupId
  ) {
    console.log("- leaveGroup");
    var session = Sessions.getSession(SessionName);
    var resultleaveGroup = await session.client.then(async client => {
      return await client.groupLeave(groupId).then(() => {
        //console.log('Result: ', result); //return object success
        return {
          "erro": false,
          "status": 200,
          "groupId": groupId,
          "message": "Grupo deixado com sucesso"
        };
      }).catch((erro) => {
        console.error('Error when sending: ', erro); //return object error
        //
        return {
          "erro": true,
          "status": 404,
          "groupId": groupId,
          "message": "Erro ao deixar o grupo"
        };
        //
      });
    });
    return resultleaveGroup;
  } //leaveGroup
  //
  // ------------------------------------------------------------------------------------------------//
  //
  // Obtenha membros do grupo
  static async getGroupMembers(
    SessionName,
    groupId
  ) {
    console.log("- getGroupMembers");
    var session = Sessions.getSession(SessionName);
    var resultgetGroupMembers = await session.client.then(async client => {
      return await client.groupMetadata(groupId).then(async (result) => {
        //console.log('Result: ', result); //return object success
        /*
        var participants = [];
        //
        await forEach(result.participants, async (resultAllContacts) => {
          //
          participants.push({
            "user": resultAllContacts.id.replace('@s.whatsapp.net', ''),
            "admin": resultAllContacts.admin
          });
          //
          //
        });
				*/
        //
        return result;
        //
      }).catch((erro) => {
        console.error('Error when sending:\n', erro); //return object error
        //
        return {
          "erro": true,
          "status": 404,
          "groupId": groupId,
          "message": "Erro ao obter membros do grupo"
        };
        //
      });
    });
    return resultgetGroupMembers;
  } //getGroupMembers
  //
  // ------------------------------------------------------------------------------------------------//
  //
  // Obter IDs de membros do grupo
  static async getGroupMembersIds(
    SessionName, groupId
  ) {
    console.log("- getGroupMembersIds");
    var session = Sessions.getSession(SessionName);
    var resultgetGroupMembersIds = await session.client.then(async client => {
      return await client.groupMetadata(groupId).then(async (result) => {
        //console.log('Result: ', result); //return object success
        //
        var participants = [];
        //
        await forEach(result.participants, async (resultAllContacts) => {
          //
          if (resultAllContacts.isSuperAdmin == false) {
            //
            participants.push({
              "server": resultAllContacts.id.split('@')[1],
              "user": resultAllContacts.id.split('@')[0],
              "_serialized": resultAllContacts.id
            });
            //
          }
          //
        });
        //
        return participants;
        //
      }).catch((erro) => {
        console.error('Error when sending:\n', erro); //return object error
        //
        return {
          "erro": true,
          "status": 404,
          "groupId": groupId,
          "message": "Erro ao obter membros do grupo"
        };
        //
      });
    });
    return resultgetGroupMembersIds;
  } //getGroupMembersIds
  //
  // ------------------------------------------------------------------------------------------------//
  //
  // Gerar link de url de convite de grupo
  static async getGroupInviteLink(
    SessionName, groupId
  ) {
    console.log("- getGroupInviteLink");
    var session = Sessions.getSession(SessionName);
    var resultgetGroupInviteLink = await session.client.then(async client => {
      return await client.groupInviteCode(groupId).then((result) => {
        //console.log('Result: ', result); //return object success
        var url = "https://chat.whatsapp.com/"
        //
        var resultInvite = {
          "erro": false,
          "status": 200,
          "groupcode": result,
          "groupurl": url + result,
          "message": "Link de convite do grupo obtido com sucesso"
        };
        //
        //
        return resultInvite;
      }).catch((erro) => {
        console.error('Error when sending: ', erro); //return object error
        //
        return {
          "erro": true,
          "status": 404,
          "groupId": groupId,
          "message": "Erro ao obter link de convite de grupo"
        };
        //
      });
    });
    return resultgetGroupInviteLink;
  } //getGroupInviteLink
  //
  // ------------------------------------------------------------------------------------------------//
  //
  // Criar grupo (título, participantes a adicionar)
  static async createGroup(
    SessionName,
    title,
    contactlistValid,
    contactlistInvalid
  ) {
    console.log("- createGroup");
    var session = Sessions.getSession(SessionName);
    var resultgetGroupInviteLink = await session.client.then(async client => {
      return await client.groupCreate(title, contactlistValid).then(async (result) => {
        //console.log('Result: ', result); //return object success
        //
        if (result.id) {
          // await client.groupUpdateDescription(result.gid, title);
          return {
            "erro": false,
            "status": 200,
            "title": result.subject,
            "groupId": result.id.replace('@g.us', ''),
            "participants": {
              contactlistValid,
              contactlistInvalid
            },
            "message": "Grupo criado com a lista de contatos validos"
          };
        } else {
          //
          return {
            "erro": true,
            "status": 404,
            "title": title,
            "groupId": null,
            "participants": {
              contactlistValid,
              contactlistInvalid
            },
            "message": "Erro ao criar grupo"
          };
          //
        }
        //
      }).catch((erro) => {
        console.error('Error when sending: ', erro); //return object error
        //
        return {
          "erro": true,
          "status": 404,
          "title": title,
          "groupId": null,
          "contactlistValid": contactlistValid,
          "contactlistInvalid": contactlistInvalid,
          "message": "Erro ao criar grupo"
        };
        //
      });
    });
    return resultgetGroupInviteLink;
  } //createGroup
  //
  // ------------------------------------------------------------------------------------------------//
  //
  // Criar grupo (título, participantes a adicionar)
  static async deleteChat(
    SessionName,
    Id
  ) {
    console.log("- deleteChat");
    var session = Sessions.getSession(SessionName);
    var resultdeleteChat = await session.client.then(async client => {
      return await client.deleteChat(Id).then((result) => {
        //console.log('Result: ', result); //return object success
        //
        if (result.status == 200 || result.status == 207) {
          return {
            "erro": false,
            "status": 200,
            "message": "Grupo apagado com sucesso"
          };
        } else {
          //
          return {
            "erro": true,
            "status": 404,
            "message": "Erro ao apagar grupo"
          };
          //
        }
        //
      }).catch((erro) => {
        console.error('Error when sending: ', erro); //return object error
        //
        return {
          "erro": true,
          "status": 404,
          "message": "Erro ao apagar grupo"
        };
        //
      });
    });
    return resultdeleteChat;
  } //deleteChat
  //
  // ------------------------------------------------------------------------------------------------//
  //
  // Remove participante
  static async removeParticipant(
    SessionName,
    groupId,
    phonefull
  ) {
    console.log("- removeParticipant");
    var session = Sessions.getSession(SessionName);
    var resultremoveParticipant = await session.client.then(async client => {
      return await client.groupParticipantsUpdate(groupId, phonefull, "remove").then(([result]) => {
        //console.log('Result: ', result); //return object success
        //
        if (result) {
          return {
            "erro": false,
            "status": 200,
            "number": phonefull,
            "message": "Participante removido com sucesso"
          };
        } else {
          //
          return {
            "erro": true,
            "status": 404,
            "number": phonefull,
            "message": "Erro ao remover participante"
          };
          //
        }
        //
      }).catch((erro) => {
        console.error('Error when sending: ', erro); //return object error
        //
        return {
          "erro": true,
          "status": 404,
          "number": phonefull,
          "message": "Erro ao remover participante"
        };
        //
      });
    });
    return resultremoveParticipant;
  } //removeParticipant
  //
  // ------------------------------------------------------------------------------------------------//
  //
  // Adicionar participante
  static async addParticipant(
    SessionName, groupId, phonefull
  ) {
    console.log("- addParticipant");
    var session = Sessions.getSession(SessionName);
    var resultaddParticipant = await session.client.then(async client => {
      return await client.groupParticipantsUpdate(groupId, phonefull, "add").then(([result]) => {
        //console.log('Result: ', result); //return object success
        //
        if (result) {
          return {
            "erro": false,
            "status": 200,
            "number": phonefull,
            "message": "Participante adicionado com sucesso"
          };
        } else {
          //
          return {
            "erro": true,
            "status": 404,
            "number": phonefull,
            "message": "Erro ao adicionar participante"
          };
          //
        }
        //
      }).catch((erro) => {
        console.error('Error when sending: ', erro); //return object error
        //
        return {
          "erro": true,
          "status": 404,
          "number": phonefull,
          "message": "Erro ao adicionar participante"
        };
        //
      });
    });
    return resultaddParticipant;
  } //addParticipant
  //
  // ------------------------------------------------------------------------------------------------//
  //
  // Promote participant (add admin privileges)
  static async promoteParticipant(
    SessionName,
    groupId,
    phonefull
  ) {
    console.log("- promoteParticipant");
    var session = Sessions.getSession(SessionName);
    var resultpromoteParticipant = await session.client.then(async client => {
      //
      return await client.groupParticipantsUpdate(groupId, phonefull, "promote").then(([result]) => {
        console.log('Result: ', result); //return object success
        //
        if (result) {
          return {
            "erro": false,
            "status": result.status,
            "number": phonefull,
            "message": "Participante promovido a administrador"
          };
        } else {
          //
          return {
            "erro": true,
            "status": result.status,
            "number": phonefull,
            "message": "Erro ao promover participante a administrador"
          };
          //
        }
        //
      }).catch((erro) => {
        console.error('Error when sending: ', erro); //return object error
        //
        return {
          "erro": true,
          "status": 404,
          "number": phonefull,
          "message": "Erro ao promover participante a administrador"
        };
        //
      });
    });
    return resultpromoteParticipant;
  } //promoteParticipant
  //
  // ------------------------------------------------------------------------------------------------//
  //
  // Depromote participant (remove admin privileges)
  static async demoteParticipant(
    SessionName, groupId, phonefull
  ) {
    console.log("- demoteParticipant");
    var session = Sessions.getSession(SessionName);
    var resultdemoteParticipant = await session.client.then(async client => {
      return await client.groupParticipantsUpdate(groupId, phonefull, "demote").then(([result]) => {
        //console.log('Result: ', result); //return object success
        //
        if (result) {
          return {
            "erro": false,
            "status": result.status,
            "number": phonefull,
            "message": "Participante removido de administrador"
          };
        } else {
          //
          return {
            "erro": true,
            "status": result.status,
            "number": phonefull,
            "message": "Erro ao remover participante de administrador"
          };
          //
        }
        //
      }).catch((erro) => {
        console.error('Error when sending: ', erro); //return object error
        //
        return {
          "erro": true,
          "status": 404,
          "number": phonefull,
          "message": "Erro ao remover participante de administrador"
        };
        //
      });
    });
    return resultdemoteParticipant;
  } //demoteParticipant
  //
  // ------------------------------------------------------------------------------------------------//
  //
  // Retorna o status do grupo, jid, descrição do link de convite
  static async getGroupInfoFromInviteLink(
    SessionName, InviteCode
  ) {
    console.log("- Obtendo chats!");
    var session = Sessions.getSession(SessionName);
    var resultgetGroupInfoFromInviteLink = await session.client.then(async client => {
      return await client.getGroupInfoFromInviteLink(InviteCode).then((result) => {
        //console.log('Result: ', result); //return object success
        return result;
      }).catch((erro) => {
        console.error('Error when sending: ', erro); //return object error
        return {
          "erro": true,
          "status": 404,
          "message": "Erro ao obter link de convite"
        };
        //
      });
    });
    return resultgetGroupInfoFromInviteLink;
  } //getGroupInfoFromInviteLink
  //
  // ------------------------------------------------------------------------------------------------//
  //
  // Junte-se a um grupo usando o código de convite do grupo
  static async joinGroup(
    SessionName,
    InviteCode
  ) {
    console.log("- joinGroup");
    var session = Sessions.getSession(SessionName);
    var resultjoinGroup = await session.client.then(async client => {
      return await client.acceptInvite(InviteCode).then(([result]) => {
        console.log('Result: ', result); //return object success
        //
        if (result) {
          return {
            "erro": false,
            "status": 200,
            "message": "Convite para grupo aceito com suceso"
          };
        } else {
          //
          return {
            "erro": true,
            "status": 404,
            "message": "Erro ao aceitar convite para grupo"
          };
          //
        }
        //
      }).catch((erro) => {
        console.error('Error when sending: ', erro); //return object error
        //
        return {
          "erro": true,
          "status": 404,
          "message": "Erro ao entra no grupo via convite"
        };
        //
      });
    });
    return resultjoinGroup;
  } //joinGroup
  //
  // ------------------------------------------------------------------------------------------------//
  //
  // Só permite que administradores enviem mensagens
  static async onlyAdminsMessagesGroup(
    SessionName,
    groupId
  ) {
    console.log("- onlyAdminsMessagesGroup");
    var session = Sessions.getSession(SessionName);
    var onlyAdminsMessagesGroup = await session.client.then(async client => {
      return await client.groupSettingUpdate(groupId, 'announcement').then((result) => {
        //console.log('- Result: ', result); //return object success
        //
        return {
          "erro": false,
          "status": 200,
          "message": "Apenas mensagens de admins do grupo"
        };
        //
      }).catch((erro) => {
        console.error('Error when sending: ', erro); //return object error
        //
        return {
          "erro": true,
          "status": 404,
          "message": "Erro ao habilitar apenas mensagens de admins"
        };
        //
      });
    });
    return onlyAdminsMessagesGroup;
  } //onlyAdminsMessagesGroup
  // 
  // ------------------------------------------------------------------------------------------------//
  //
  // Todos enviem mensagens
  static async everyoneMessagesGroup(
    SessionName,
    groupId
  ) {
    console.log("- onlyAdminsMessagesGroup");
    var session = Sessions.getSession(SessionName);
    var onlyAdminsMessagesGroup = await session.client.then(async client => {
      return await client.groupSettingUpdate(groupId, 'not_announcement').then((result) => {
        //console.log('- Result: ', result); //return object success
        //
        return {
          "erro": false,
          "status": 200,
          "message": "Apenas mensagens de admins do grupo"
        };
        //
      }).catch((erro) => {
        console.error('Error when sending: ', erro); //return object error
        //
        return {
          "erro": true,
          "status": 404,
          "message": "Erro ao habilitar apenas mensagens de admins"
        };
        //
      });
    });
    return onlyAdminsMessagesGroup;
  } //onlyAdminsMessagesGroup
  //
  // ------------------------------------------------------------------------------------------------//
  //
  // Permitir que todos modifiquem as configurações do grupo
  static async everyoneModifySettingsGroup(
    SessionName,
    groupId,
    change
  ) {
    console.log("- everyoneModifySettingsGroup");
    var session = Sessions.getSession(SessionName);
    var everyoneModifySettingsGroup = await session.client.then(async client => {
      return await client.groupSettingUpdate(groupId, 'unlocked').then((result) => {
        //console.log('- Result: ', result); //return object success
        //
        return {
          "erro": false,
          "status": 200,
          "message": "Todos podem modificar as configurações do grupo"
        };
        //
      }).catch((erro) => {
        console.error('Error when sending: ', erro); //return object error
        //
        return {
          "erro": true,
          "status": 404,
          "message": "Erro ao habilitar as configurações do grupo para todos"
        };
        //
      });
    });
    return everyoneModifySettingsGroup;
  } //everyoneModifySettingsGroup
  //
  // ------------------------------------------------------------------------------------------------//
  //
  // Só permite que os administradores modifiquem as configurações do grupo
  static async everyoneAdminsModifySettingsGroup(
    SessionName,
    groupId
  ) {
    console.log("- everyoneAdminsModifySettingsGroup");
    var session = Sessions.getSession(SessionName);
    var onlyAdminsMessagesGroup = await session.client.then(async client => {
      return await client.groupSettingUpdate(groupId, 'locked').then((result) => {
        //console.log('- Result: ', result); //return object success
        //
        return {
          "erro": false,
          "status": 200,
          "message": "Apenas administradores podem modificar as configurações do grupo."
        };
        //
      }).catch((erro) => {
        console.error('Error when sending: ', erro); //return object error
        //
        return {
          "erro": true,
          "status": 404,
          "message": "Erro ao habilitar que administradores modifiquem as configurações do grupo"
        };
        //
      });
    });
    return onlyAdminsMessagesGroup;
  } //onlyAdminsMessagesGroup
  //
  // ------------------------------------------------------------------------------------------------//
  //
  /*
  ╔═╗┬─┐┌─┐┌─┐┬┬  ┌─┐  ╔═╗┬ ┬┌┐┌┌─┐┌┬┐┬┌─┐┌┐┌┌─┐           
  ╠═╝├┬┘│ │├┤ ││  ├┤   ╠╣ │ │││││   │ ││ ││││└─┐           
  ╩  ┴└─└─┘└  ┴┴─┘└─┘  ╚  └─┘┘└┘└─┘ ┴ ┴└─┘┘└┘└─┘           
  */
  //
  // Set client status
  static async setProfileStatus(
    SessionName, ProfileStatus
  ) {
    console.log("- setProfileStatus");
    var session = Sessions.getSession(SessionName);
    var resultsetProfileStatus = await session.client.then(async client => {
      return await client.setProfileStatus(ProfileStatus).then((result) => {
        //console.log('Result: ', result); //return object success
        //
        return {
          "erro": false,
          "status": 200,
          "message": "Profile status alterado com sucesso."
        };
        //
      }).catch((erro) => {
        console.error('Error when sending: ', erro); //return object error
        //return erro;
        return {
          "erro": true,
          "status": 404,
          "message": "Erro ao alterar profile status."
        };
        //
      });
    });
    return resultsetProfileStatus;
  } //setProfileStatus
  //
  // ------------------------------------------------------------------------------------------------//
  //
  // Set client profile name
  static async setProfileName(
    SessionName, ProfileName
  ) {
    console.log("- setProfileName");
    var session = Sessions.getSession(SessionName);
    var resultsetProfileName = await session.client.then(async client => {
      return await client.updateProfileName(ProfileName).then((result) => {
        //console.log('Result: ', result); //return object success
        //
        return {
          "erro": false,
          "status": 200,
          "message": "Profile name alterado com sucesso."
        };
        //
      }).catch((erro) => {
        console.error('Error when sending: ', erro); //return object error
        //return erro;
        return {
          "erro": true,
          "status": 404,
          "message": "Erro ao alterar profile name."
        };
        //
      });
    });
    return resultsetProfileName;
  } //setProfileName
  //
  // ------------------------------------------------------------------------------------------------//
  //
  // Set client profile photo
  static async setProfilePic(
    SessionName, path
  ) {
    console.log("- setProfilePic");
    var session = Sessions.getSession(SessionName);
    var resultsetProfilePic = await session.client.then(async client => {
      return await client.setProfilePic(path).then((result) => {
        //console.log('Result: ', result); //return object success
        //
        return {
          "erro": false,
          "status": 200,
          "message": "Profile pic alterado com sucesso."
        };
        //
      }).catch((erro) => {
        console.error('Error when sending: ', erro); //return object error
        //
        return {
          "erro": true,
          "status": 404,
          "message": "Erro ao alterar profile pic."
        };
        //
      });
    });
    return resultsetProfilePic;
  } //setProfilePic
  //
  // ------------------------------------------------------------------------------------------------//
  //
  /*
  ╔╦╗┌─┐┬  ┬┬┌─┐┌─┐  ╔═╗┬ ┬┌┐┌┌─┐┌┬┐┬┌─┐┌┐┌┌─┐             
   ║║├┤ └┐┌┘││  ├┤   ╠╣ │ │││││   │ ││ ││││└─┐             
  ═╩╝└─┘ └┘ ┴└─┘└─┘  ╚  └─┘┘└┘└─┘ ┴ ┴└─┘┘└┘└─┘             
  */
  //
  // Delete the Service Worker
  static async killServiceWorker(SessionName) {
    console.log("- killServiceWorker");
    var session = Sessions.getSession(SessionName);
    var resultkillServiceWorker = await session.client.then(async client => {
      return await client.killServiceWorker().then((result) => {
        //console.log('Result: ', result); //return object success
        //
        return {
          "erro": false,
          "status": 200,
          "message": "Serviço parado com sucesso.",
          "killService": result
        };
        //
      }).catch((erro) => {
        console.error('Error when sending: ', erro); //return object error
        //
        return {
          "erro": true,
          "status": 404,
          "message": "Erro ao parar serviço."
        };
        //
      });
    });
    return resultkillServiceWorker;
  } //killServiceWorker
  //
  // ------------------------------------------------------------------------------------------------//
  //
  // Load the service again
  static async restartService(SessionName) {
    console.log("- restartService");
    var session = Sessions.getSession(SessionName);
    var resultrestartService = await session.client.then(async client => {
      return await client.restartService().then((result) => {
        //console.log('Result: ', result); //return object success
        //
        return {
          "erro": false,
          "status": 200,
          "message": "Serviço reiniciado com sucesso.",
          "restartService": result
        };
        //
      }).catch((erro) => {
        console.error('Error when sending: ', erro); //return object error
        //
        return {
          "erro": true,
          "status": 404,
          "message": "Erro ao reiniciar serviço."
        };
        //
      });
    });
    return resultrestartService;
  } //restartService
  //
  // ------------------------------------------------------------------------------------------------//
  //
  // Get device info
  static async getHostDevice(SessionName) {
    console.log("- getHostDevice");
    var session = Sessions.getSession(SessionName);
    var resultgetHostDevice = await session.client.then(async client => {
      return await client.getHostDevice().then((result) => {
        //console.log('Result: ', result); //return object success
        //
        return {
          "erro": false,
          "status": 200,
          "message": "Dados do dispositivo obtido com sucesso",
          "HostDevice": {
            "user": result.wid.user,
            "connected": result.connected,
            "isResponse": result.isResponse,
            "battery": result.battery,
            "plugged": result.plugged,
            "locales": result.locales,
            "is24h": result.is24h,
            "device_manufacturer": result.phone.device_manufacturer,
            "platform": result.platform,
            "os_version": result.phone.os_version,
            "wa_version": result.phone.wa_version,
            "pushname": result.pushname
          }
        };
        //
      }).catch((erro) => {
        console.error('Error when sending: ', erro); //return object error
        //
        return {
          "erro": true,
          "status": 404,
          "message": "Erro ao obter dados do dispositivo"
        };
        //
      });
    });
    return resultgetHostDevice;
  } //getHostDevice
  //
  // ------------------------------------------------------------------------------------------------//
  //
  // Get connection state
  static async getConnectionState(SessionName) {
    console.log("- getConnectionState");
    var session = Sessions.getSession(SessionName);
    var resultisConnected = await session.client.then(async client => {
      return await client.getConnectionState().then((result) => {
        //console.log('Result: ', result); //return object success
        //
        return {
          "erro": false,
          "status": 200,
          "message": "Estado do dispositivo obtido com sucesso",
          "ConnectionState": result

        };
        //
      }).catch((erro) => {
        console.error('Error when sending: ', erro); //return object error
        //
        return {
          "erro": true,
          "status": 404,
          "message": "Erro ao obter o estado da conexão"
        };
        //
      });
    });
    return resultisConnected;
  } //getConnectionState
  //
  // ------------------------------------------------------------------------------------------------//
  //
  // Get battery level
  static async getBatteryLevel(SessionName) {
    console.log("- getBatteryLevel");
    var session = Sessions.getSession(SessionName);
    var resultgetBatteryLevel = await session.client.then(async client => {
      return await client.getBatteryLevel().then((result) => {
        //console.log('Result: ', result); //return object success
        //
        return {
          "erro": false,
          "status": 200,
          "message": "Nivel da bateria obtido com sucesso",
          "BatteryLevel": result

        };
        //
      }).catch((erro) => {
        console.error('Error when sending: ', erro); //return object error
        //
        return {
          "erro": true,
          "status": 404,
          "message": "Erro ao obter o nivel da bateria"
        };
        //
      });
    });
    return resultgetBatteryLevel;
  } //getBatteryLevel
  //
  // ------------------------------------------------------------------------------------------------//
  //
  // Is Connected
  static async isConnected(SessionName) {
    console.log("- isConnected");
    var session = Sessions.getSession(SessionName);
    var resultisConnected = await session.client.then(async client => {
      return await client.isConnected().then((result) => {
        //console.log('Result: ', result); //return object success
        //
        return {
          "erro": false,
          "status": 200,
          "message": "Estatus obtido com sucesso",
          "Connected": result
        };
        //
      }).catch((erro) => {
        console.error('Error when sending: ', erro); //return object error
        //
        return {
          "erro": true,
          "status": 404,
          "message": "Erro ao obter estatus"
        };
        //
      });
    });
    return resultisConnected;
  } //isConnected
  //
  // ------------------------------------------------------------------------------------------------//
  //
  // Obter versão do WhatsappWeb
  static async getWAVersion(SessionName) {
    console.log("- getWAVersion");
    var session = Sessions.getSession(SessionName);
    var resultgetWAVersion = await session.client.then(async client => {
      return await client.getWAVersion().then((result) => {
        //console.log('Result: ', result); //return object success
        //
        return {
          "erro": false,
          "status": 200,
          "message": "Versão do WhatsappWeb obtido com sucesso",
          "WAVersion": result
        };
        //
      }).catch((erro) => {
        console.error('Error when sending: ', erro); //return object error
        //
        return {
          "erro": true,
          "status": 404,
          "message": "Erro ao obter versão do WhatsappWeb"
        };
        //
      });
    });
    return resultgetWAVersion;
  } //getWAVersion
  //
  // ------------------------------------------------------------------------------------------------//
  //
  // Inicia a verificação de conexão do telefone
  static async startPhoneWatchdog(SessionName, interval) {
    console.log("- startPhoneWatchdog");
    var session = Sessions.getSession(SessionName);
    var resultgetWAVersion = await session.client.then(async client => {
      return await client.startPhoneWatchdog(interval).then((result) => {
        //console.log('Result: ', result); //return object success
        //
        return {
          "erro": false,
          "status": 200,
          "message": "Verificação de conexão do telefone iniciada com sucesso",
          "PhoneWatchdog": result
        };
        //
      }).catch((erro) => {
        console.error('Error when sending: ', erro); //return object error
        //
        return {
          "erro": true,
          "status": 404,
          "message": "Erro ao inicia a verificação de conexão do telefone"
        };
        //
      });
    });
    return resultgetWAVersion;
  } //startPhoneWatchdog
  //
  // ------------------------------------------------------------------------------------------------//
  //
  // Para a verificação de conexão do telefone
  static async stopPhoneWatchdog(SessionName) {
    console.log("- stopPhoneWatchdog");
    var session = Sessions.getSession(SessionName);
    var resultgetWAVersion = await session.client.then(async client => {
      return await client.stopPhoneWatchdog().then((result) => {
        //console.log('Result: ', result); //return object success
        //
        return {
          "erro": false,
          "status": 200,
          "message": "Verificação de conexão parada iniciada com sucesso",
          "PhoneWatchdog": result
        };
        //
      }).catch((erro) => {
        console.error('Error when sending: ', erro); //return object error
        //
        return {
          "erro": true,
          "status": 404,
          "message": "Erro ao parar a verificação de conexão do telefone"
        };
        //
      });
    });
    return resultgetWAVersion;
  } //getWAVersion
  //
  // ------------------------------------------------------------------------------------------------//
  //
  /*
  ╔╦╗┌─┐┌─┐┌┬┐┌─┐┌─┐  ┌┬┐┌─┐  ╦═╗┌─┐┌┬┐┌─┐┌─┐
   ║ ├┤ └─┐ │ ├┤ └─┐   ││├┤   ╠╦╝│ │ │ ├─┤└─┐
   ╩ └─┘└─┘ ┴ └─┘└─┘  ─┴┘└─┘  ╩╚═└─┘ ┴ ┴ ┴└─┘
   */
  //
  // ------------------------------------------------------------------------------------------------//
  //
  static async RotaTeste() {
    //console.log('Result: ', result); //return object success
    //
    var result = {
      "556792373218@s.whatsapp.net": {
        "jid": "556792373218@s.whatsapp.net",
        "notify": "Juciane Medeiros",
        "name": "Juci/Maianne",
        "short": "Juci/Maianne"
      },
      "556791400941@s.whatsapp.net": {
        "jid": "556791400941@s.whatsapp.net",
        "name": "Paulinho / Garagem Flávio",
        "short": "Paulinho /"
      },
      "554396030588@s.whatsapp.net": {
        "jid": "554396030588@s.whatsapp.net",
        "notify": "Gabriel Milhorini"
      }
    };
    //
    console.log(result[1]);
    //
    var getChatGroupNewMsg = [];
    //
    await forEach(result, async (resultAllContacts) => {
      //
      getChatGroupNewMsg.push({
        "user": resultAllContacts.jid,
        "name": resultAllContacts.name,
        "shortName": resultAllContacts.short,
        "pushname": resultAllContacts.notify,
        "formattedName": resultAllContacts.vname,
        "isMyContact": resultAllContacts.verify
      });
      //
    });
    //
    return getChatGroupNewMsg;
    //
  } //RotaTeste
  //
  // ------------------------------------------------------------------------------------------------//
  //
}