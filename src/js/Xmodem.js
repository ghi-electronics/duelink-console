/**
 * Instantiate by `var xmodem = require('xmodem');`
 * @class
 * @classdesc XMODEM Protocol in JavaScript
 * @name Xmodem
 * @license BSD-2-Clause
 */
// Updated from the original code by mcalsyn@pervasive.digital

import fs from "fs";
import crc from "crc";
import EventEmitter from "eventemitter3";
import { Buffer } from "buffer";

class Xmodem extends EventEmitter {
  /* Either use the tracer module to output infromation
   * or redefine the functions for silence!
   */
  //const log = require('tracer').colorConsole();
  log = {
    info: (s) => {
      console.log("Xmodem (inf) : ", s);
    },
    warn: (s) => {
      console.log("Xmodem: (wrn)", s);
    },
    error: (s) => {
      console.log("Xmodem: (err)", s);
    },
    debug: (s) => {
      console.log("Xmodem: (dbg)", s);
    },
  };

  SOH = 0x01;
  STX = 0x02;
  EOT = 0x04;
  ACK = 0x06;
  NAK = 0x15;
  CAN = 0x18; // not implemented
  FILLER = 0x1a;
  CRC_MODE = 0x43; // 'C'

  receive_interval_timer = false;

  /**
   * xmodem.js package version.
   * @constant
   * @type {string}
   */
  static get VERSION() {
    return require("../../../package.json").version;
  }

  /**
   * how many timeouts in a row before the sender gives up?
   * @constant
   * @type {integer}
   * @default
   */
  XMODEM_MAX_TIMEOUTS = 5;

  /**
   * how many errors on a single block before the receiver gives up?
   * @constant
   * @type {integer}
   * @default
   */
  XMODEM_MAX_ERRORS = 10;

  /**
   * how many times should receiver attempt to use CRC?
   * @constant
   * @type {integer}
   * @default
   */
  XMODEM_CRC_ATTEMPTS = 3;

  /**
   * Try to use XMODEM-CRC extension or not? Valid options: 'crc' or 'normal'
   * @constant
   * @type {string}
   * @default
   */
  XMODEM_OP_MODE = "crc";

  /**
   * First block number. Don't change this unless you have need for non-standard
   * implementation.
   * @constant
   * @type {integer}
   * @default
   */
  XMODEM_START_BLOCK = 1;

  /**
   * default timeout period in seconds
   * @constant
   * @type {integer}
   * @default
   */
  timeout_seconds = 10;

  /**
   * how many bytes (excluding header & checksum) in each block? Don't change this
   * unless you have need for non-standard implementation.
   * @constant
   * @type {integer}
   * @default
   */
  block_size = 1024; // xmodem 1K protocol

  /**
   * Send a file using XMODEM protocol
   * @method
   * @name Xmodem#send
   * @param {socket} socket - net.Socket() or Serialport socket for transport
   * @param {buffer} dataBuffer - Buffer() to be sent
   */
  async send(reader, writer, dataToSend, progressfn) {
    try {
      dataToSend = new Uint8Array(dataToSend);

      await this.sendLoop(reader, writer, dataToSend, progressfn);
    } catch (err) {
      console.log(err);
    }
  }

  async sendLoop(reader, writer, dataToSend, progressfn) {
    var blockNumber = this.XMODEM_START_BLOCK;
    var packagedBuffer = [];
    var current_block = Buffer.alloc(this.block_size);
    var sent_eof = false;

    // FILLER
    for (var i = 0; i < this.XMODEM_START_BLOCK; i++) {
      packagedBuffer.push("");
    }

    while (dataToSend.length > 0) {
      for (i = 0; i < this.block_size; i++) {
        current_block[i] =
          dataToSend[i] === undefined ? this.FILLER : dataToSend[i];
      }
      dataToSend = dataToSend.slice(this.block_size);
      packagedBuffer.push(current_block);
      current_block = Buffer.alloc(this.block_size);
    }

    this.emit("ready", packagedBuffer.length - 1); // We don't count the filler

    while (!sent_eof) {
      try {
        if (progressfn) {
          progressfn(blockNumber, packagedBuffer.length);
        }
        const { value, done } = await reader.read();

        if (value) {
          var data = [...value];

          // We could have a whole parade of 'C's so discard all of them and just set a flag that says to send the first block
          var command = " ";
          do {
            command = data.shift();
          } while (command === this.CRC_MODE && data.length > 0);

          if (
            command === this.CRC_MODE &&
            blockNumber !== this.XMODEM_START_BLOCK
          ) {
            // still eating 'C' characters
            continue;
          } else if (
            command === this.CRC_MODE &&
            blockNumber === this.XMODEM_START_BLOCK
          ) {
            this.log.info("[SEND] - received C byte for CRC transfer!");
            this.XMODEM_OP_MODE = "crc";
            if (packagedBuffer.length > blockNumber) {
              /**
               * Transmission Start event. A successful start of transmission.
               * @event Xmodem#start
               * @property {string} - Indicates transmission mode 'crc' or 'normal'
               */
              this.emit("start", this.XMODEM_OP_MODE);
              this.sendBlock(
                writer,
                blockNumber,
                packagedBuffer[blockNumber],
                this.XMODEM_OP_MODE
              );
              this.emit("status", {
                action: "send",
                signal: "STX",
                block: blockNumber,
              });
              blockNumber++;
            }
          } else if (
            command === this.NAK &&
            blockNumber === this.XMODEM_START_BLOCK
          ) {
            this.log.info(
              "[SEND] - received NAK byte for standard checksum transfer!"
            );
            this.XMODEM_OP_MODE = "normal";
            if (packagedBuffer.length > blockNumber) {
              this.emit("start", this.XMODEM_OP_MODE);
              this.sendBlock(
                writer,
                blockNumber,
                packagedBuffer[blockNumber],
                this.XMODEM_OP_MODE
              );
              this.emit("status", {
                action: "send",
                signal: "STX",
                block: blockNumber,
              });
              blockNumber++;
            }
          } else if (
            /*
             * Here we handle the actual transmission of data and
             * retransmission in case the block was not accepted.
             */
            command === this.ACK &&
            blockNumber > this.XMODEM_START_BLOCK
          ) {
            // Woohooo we are ready to send the next block! :)
            this.log.info("ACK RECEIVED");
            this.emit("status", { action: "recv", signal: "ACK" });
            if (packagedBuffer.length > blockNumber) {
              this.sendBlock(
                writer,
                blockNumber,
                packagedBuffer[blockNumber],
                this.XMODEM_OP_MODE
              );
              this.emit("status", {
                action: "send",
                signal: "STX",
                block: blockNumber,
              });
              blockNumber++;
            } else if (packagedBuffer.length === blockNumber) {
              // We are EOT
              if (sent_eof === false) {
                sent_eof = true;
                this.log.info("WE HAVE RUN OUT OF STUFF TO SEND, EOT EOT!");
                this.emit("status", { action: "send", signal: "EOT" });
                writer.write(Buffer.from([this.EOT]));
              } else {
                // We are finished!
                this.log.info("[SEND] - Finished!");
                this.emit("stop", 0);
              }
            }
          } else if (
            command === this.NAK &&
            blockNumber > this.XMODEM_START_BLOCK
          ) {
            if (blockNumber === packagedBuffer.length && sent_eof) {
              this.log.info(
                "[SEND] - Resending EOT, because receiver responded with NAK."
              );
              this.emit("status", { action: "send", signal: "EOT" });
              writer.write(Buffer.from[this.EOT]);
            } else {
              this.log.info(
                "[SEND] - Packet corruption detected, resending previous block."
              );
              this.emit("status", { action: "recv", signal: "NAK" });
              blockNumber--;
              if (packagedBuffer.length > blockNumber) {
                this.sendBlock(
                  writer,
                  blockNumber,
                  packagedBuffer[blockNumber],
                  this.XMODEM_OP_MODE
                );
                this.emit("status", {
                  action: "send",
                  signal: "STX",
                  block: blockNumber,
                });
                blockNumber++;
              }
            }
          } else {
            this.log.warn(
              "GOT SOME UNEXPECTED DATA which was not handled properly!"
            );
            this.log.warn("===>");
            this.log.warn("command : " + command);
            this.log.warn("value : " + data);
            this.log.warn("<===");
            this.log.warn("blockNumber: " + blockNumber);
          }
        }
        if (done || sent_eof) {
          //console.log('[sendLoop] DONE', done);
          break;
        }
      } catch (err) {
        //console.log("Xmodem serial port error", err)
      }
    }
  }

  // /**
  //  * Receive a file using XMODEM protocol
  //  * @method
  //  * @name Xmodem#receive
  //  * @param {socket} socket - net.Socket() or Serialport socket for transport
  //  * @param {string} filename - pathname where to save the transferred file
  //  */
  // receive(socket, filename) {
  //   var blockNumber = this.XMODEM_START_BLOCK;
  //   var packagedBuffer = [];
  //   var nak_tick = this.XMODEM_MAX_ERRORS * this.timeout_seconds * 3;
  //   var crc_tick = this.XMODEM_CRC_ATTEMPTS;
  //   var transfer_initiated = false;
  //   var tryCounter = 0;

  //   // FILLER
  //   for (var i = 0; i < this.XMODEM_START_BLOCK; i++) {
  //     packagedBuffer.push("");
  //   }

  //   // Let's try to initate transfer with XMODEM-CRC
  //   if (this.XMODEM_OP_MODE === 'crc') {
  //     this.log.info("CRC init sent");
  //     socket.write(Buffer.from([this.CRC_MODE]));
  //     this.receive_interval_timer = this.setIntervalX(function () {
  //       if (transfer_initiated === false) {
  //         this.log.info("CRC init sent");
  //         socket.write(Buffer.from([this.CRC_MODE]));
  //       }
  //       else {
  //         clearInterval(this.receive_interval_timer);
  //         this.receive_interval_timer = false;
  //       }
  //       // Fallback to standard XMODEM
  //       if (this.receive_interval_timer === false && transfer_initiated === false) {
  //         this.receive_interval_timer = this.setIntervalX(function () {
  //           this.log.info("NAK init sent");
  //           socket.write(Buffer.fron([this.NAK]));
  //           this.XMODEM_OP_MODE = 'normal';
  //         }, 3000, nak_tick);
  //       }
  //     }, 3000, (crc_tick - 1));
  //   }
  //   else {
  //     this.receive_interval_timer = this.setIntervalX(function () {
  //       this.log.info("NAK init sent");
  //       socket.write(Buffer.from([this.NAK]));
  //       this.XMODEM_OP_MODE = 'normal';
  //     }, 3000, nak_tick);
  //   }

  //   const receiveData = function (data) {
  //     tryCounter++;
  //     this.log.info('[RECV] - Received: ' + data.toString('utf-8'));
  //     this.log.info(data);

  //     if (data[0] === this.NAK && blockNumber === this.XMODEM_START_BLOCK) {
  //       this.log.info("[RECV] - received NAK byte!");
  //     }
  //     else if (data[0] === this.SOH && tryCounter <= this.XMODEM_MAX_ERRORS) {
  //       if (transfer_initiated === false) {
  //         // Initial byte received
  //         transfer_initiated = true;
  //         clearInterval(this.receive_interval_timer);
  //         this.receive_interval_timer = false;
  //       }

  //       this.receiveBlock(socket, blockNumber, data, this.block_size, this.XMODEM_OP_MODE, function (current_block) {
  //         this.log.info(current_block);
  //         packagedBuffer.push(current_block);
  //         tryCounter = 0;
  //         blockNumber++;
  //       });
  //     }
  //     else if (data[0] === this.EOT) {
  //       this.log.info("Received EOT");
  //       socket.write(Buffer.from([this.ACK]));
  //       blockNumber--;
  //       for (i = packagedBuffer[blockNumber].length - 1; i >= 0; i--) {
  //         if (packagedBuffer[blockNumber][i] === this.FILLER) {
  //           continue;
  //         }
  //         else {
  //           packagedBuffer[blockNumber] = packagedBuffer[blockNumber].slice(0, i + 1);
  //           break;
  //         }
  //       }
  //       // At this stage the packaged buffer should be ready for writing
  //       this.writeFile(packagedBuffer, filename, function () {
  //         if (socket.constructor.name === "Socket") {
  //           socket.destroy();
  //         }
  //         else if (socket.constructor.name === "SerialPort") {
  //           socket.close();
  //         }
  //         // remove the data listener
  //         socket.removeListener('data', receiveData);
  //       });
  //     }
  //     else {
  //       this.log.warn("GOT SOME UNEXPECTED DATA which was not handled properly!");
  //       this.log.warn("===>");
  //       this.log.warn(data);
  //       this.log.warn("<===");
  //       this.log.warn("blockNumber: " + blockNumber);
  //     }
  //   }

  //   socket.on('data', receiveData);

  // }

  /**
   * Internal helper function for scoped intervals
   * @private
   */
  setIntervalX(callback, delay, repetitions) {
    var x = 0;
    var intervalID = setInterval(function () {
      if (++x === repetitions) {
        clearInterval(intervalID);
        this.receive_interval_timer = false;
      }
      callback();
    }, delay);
    return intervalID;
  }

  sendBlock(writer, blockNr, blockData, mode) {
    var crcCalc = 0;
    //    var sendBuffer = Buffer.concat([Buffer.from([this.SOH]),
    var sendBuffer = Buffer.concat([
      Buffer.from([this.STX]), // use STX to indicate Xmodem-1K protocol
      Buffer.from([blockNr]),
      Buffer.from([0xff - blockNr]),
      blockData,
    ]);
    this.log.info("SENDBLOCK! Data length: " + blockData.length);
    this.log.info(sendBuffer);
    if (mode === "crc") {
      var crcString = crc.crc16xmodem(blockData).toString(16);
      // Need to avoid odd string for Buffer creation
      if (crcString.length % 2 === 1) {
        crcString = "0".concat(crcString);
      }
      // CRC must be 2 bytes of length
      if (crcString.length === 2) {
        crcString = "00".concat(crcString);
      }
      sendBuffer = Buffer.concat([sendBuffer, Buffer.from(crcString, "hex")]);
    } else {
      // Count only the blockData into the checksum
      for (var i = 3; i < sendBuffer.length; i++) {
        crcCalc = crcCalc + sendBuffer.readUInt8(i);
      }
      crcCalc = crcCalc % 256;
      crcCalc = crcCalc.toString(16);
      if (crcCalc.length % 2 !== 0) {
        // Add padding for the string to be even
        crcCalc = "0" + crcCalc;
      }
      sendBuffer = Buffer.concat([sendBuffer, Buffer.from(crcCalc, "hex")]);
    }
    this.log.info("Sending buffer with total length: " + sendBuffer.length);
    writer.write(sendBuffer);
  }

  receiveBlock(socket, blockNr, blockData, block_size, mode, callback) {
    var cmd = blockData[0];
    var block = parseInt(blockData[1]);
    var block_check = parseInt(blockData[2]);
    var current_block;
    var checksum_length = mode === "crc" ? 2 : 1;

    if (cmd === this.STX) {
      if (block + block_check === 0xff) {
        // Are we expecting this block?
        if (block === blockNr % 0x100) {
          current_block = blockData.slice(
            3,
            blockData.length - checksum_length
          );
        } else {
          this.log.error(
            "ERROR: Synch issue! Received: " + block + " Expected: " + blockNr
          );
          return;
        }
      } else {
        this.log.error("ERROR: Block integrity check failed!");
        socket.write(Buffer.from([this.NAK]));
        return;
      }

      if (current_block.length === block_size) {
        socket.write(Buffer.from([this.ACK]));
        callback(current_block);
      } else {
        this.log.error(
          "ERROR: Received block size did not match the expected size. Received: " +
            current_block.length +
            " | Expected: " +
            block_size
        );
        socket.write(Buffer.from([this.NAK]));
        return;
      }
    } else {
      this.log.error("ERROR!");
      return;
    }
  }

  writeFile(buffer, filename, callback) {
    this.log.info("writeFile called");
    var fileStream = fs.createWriteStream(filename);
    fileStream.once("open", function (fd) {
      this.log.info("File stream opened, buffer length: " + buffer.length);
      for (var i = 0; i < buffer.length; i++) {
        fileStream.write(buffer[i]);
      }
      fileStream.end();
      this.log.info("File written");
      callback();
    });
  }
}

export default Xmodem;
