///<reference path="./typings/index.d.ts"/>
import * as Net from 'net';
import * as _ from 'lodash';
import {getProperIP} from './utils';
import Client from './client';
import ServerDetails from './serverdetails';
import GlobalHandlers from './globalhandlers';
import {ConfigServer, ConfigOptions} from './config';
import RoutingServer from './routingserver';

class ListenServer {
  idCounter: number;
  clients: Client[];
  servers: RoutingServer[];
  options: ConfigOptions;
  port: number;
  routingServers: RoutingServer[];
  serversDetails: { [id: string]: ServerDetails };
  globalHandlers: GlobalHandlers;
  ServerHandleError: (error: Error) => void;
  ServerHandleSocket: (socket: Net.Socket) => void;
  ServerHandleStart: () => void;
  server: Net.Server;

  constructor(info: ConfigServer, serversDetails: { [id: string]: ServerDetails }, globalHandlers: GlobalHandlers, servers: RoutingServer[], options: ConfigOptions) {
    this.idCounter = 0;
    this.clients = [];
    this.servers = servers;
    this.options = options;
    this.port = info.listenPort;
    this.routingServers = info.routingServers;
    this.serversDetails = serversDetails;
    this.globalHandlers = globalHandlers;

    // Init counts
    var details;
    for (var i = 0; i < this.routingServers.length; i++) {
      this.serversDetails[this.routingServers[i].name] = {
        clientCount: 0,
        disabled: false,
        failedConnAttempts: 0
      };
    }


    this.ServerHandleError = this.handleError.bind(this);
    this.ServerHandleSocket = this.handleSocket.bind(this);
    this.ServerHandleStart = this.handleStart.bind(this);

    // Listen Server
    this.server = Net.createServer(this.ServerHandleSocket);
    this.server.listen(this.port, this.ServerHandleStart);
    this.server.on('error', this.ServerHandleError);
  }

  // Finds server with lowest client count
  chooseServer(): RoutingServer {
    let chosenServer: RoutingServer = null;
    let currentClientCount: number = null;
    let details: ServerDetails;
    for (let i: number = 0; i < this.routingServers.length; i++) {
      details = this.serversDetails[this.routingServers[i].name];

      // Even if the server has been disabled, if we have no current choice, we must use it
      if (!details.disabled || currentClientCount === null) {
        // Favour either lower player count or non-disability
        if (currentClientCount === null || details.clientCount < currentClientCount || this.serversDetails[chosenServer.name].disabled) {
          chosenServer = this.routingServers[i];
          currentClientCount = details.clientCount;
        }
      }
    }

    return chosenServer;
  }

  updateInfo(info: ConfigServer): void {
    this.port = info.listenPort;
    this.routingServers = info.routingServers;

    // Reset counts
    var details;
    for (let i: number = 0; i < this.routingServers.length; i++) {
      details = this.serversDetails[this.routingServers[i].name];
      details.disabled = false;
      details.failedConnAttempts = 0;
    }
  }

  shutdown(): void {
    console.log("\033[33m[" + process.pid + "] Server on " + this.port + " is now shutting down.\033[37m");
    for (let i: number = 0; i < this.clients.length; i++) {
      this.clients[i].server.socket.removeListener('data', this.clients[i].ServerHandleData);
      this.clients[i].server.socket.removeListener('error', this.clients[i].ServerHandleError);
      this.clients[i].server.socket.removeListener('close', this.clients[i].ServerHandleClose);
      this.clients[i].handleClose = function () { };
      this.clients[i].socket.destroy();
    }
    this.clients = [];
    this.server.removeListener('error', this.ServerHandleError);
    this.server.close();

    // Reset counts
    let details: ServerDetails;
    for (var i = 0; i < this.routingServers.length; i++) {
      details = this.serversDetails[this.routingServers[i].name];
      details.clientCount = 0;
    }
  }

  handleStart(): void {
    console.log("\033[32m[" + process.pid + "] Server on " + this.port + " started.\033[37m");
  }

  handleSocket(socket: Net.Socket): void {
    let chosenServer: RoutingServer = this.chooseServer();
    if (socket && socket.remoteAddress) {
      console.log("[" + process.pid + "] Client: " + getProperIP(socket.remoteAddress) + " connected [" + chosenServer.name + ": " + (this.serversDetails[chosenServer.name].clientCount + 1) + "]");
    } else {
      console.log("Unknown client");
    }

    var client = new Client(this.idCounter++, socket, chosenServer, this.serversDetails, this.globalHandlers, this.servers, this.options);
    this.clients.push(client);

    socket.on('data', (data: Buffer) => {
      try {
        client.handleDataSend(data);
      } catch (e) {
        console.log("HandleDataSend ERROR: " + e);
      }
    });

    socket.on('error', (e: Error) => {
      try {
        client.handleError(e);
      } catch (error) {
        console.log("handleError ERROR: " + e);
      }
    });

    socket.on('close', () => {
      try {
        if (socket && socket.remoteAddress) {
          console.log("[" + process.pid + "] Client: " + getProperIP(socket.remoteAddress) + " disconnected [" + client.server.name + ": " + (this.serversDetails[client.server.name].clientCount) + "]");
        } else {
          console.log("Client [" + client.ID + "] with unknown IP closed.");
        }
        client.handleClose();
        for (let i: number = 0; i < this.clients.length; i++) {
          if (this.clients[i].ID === client.ID) {
            this.clients.splice(i, 1);
            break;
          }
        }
      } catch (e) {
        console.log("SocketCloseEvent ERROR: " + e);
      }
    });
  }

  handleError(error: Error) {
    console.log("\033[31m Server on " + this.port + " encountered an error: " + error + ".\033[37m");
  }
}

export default ListenServer;