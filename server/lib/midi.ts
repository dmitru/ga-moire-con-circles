import * as easymidi from "easymidi";
import { throttle } from "lodash";

export const createVirtualMidiIn = (name: string) => {
  return new easymidi.Input(name, true);
};

export const createVirtualMidiOut = (name: string) => {
  return new easymidi.Output(name, true);
};
export const createMidiOut = (name: string) => {
  try {
    return new easymidi.Output(name);
  } catch (error) {
    return createVirtualMidiOut("Virtual Output");
  }
};

export const sendMidiOn = (
  midiOut: easymidi.Output,
  params: { note: number; velocity: number; channel: easymidi.Channel }
) => {
  midiOut.send("noteon", {
    note: params.note,
    velocity: params.velocity,
    channel: params.channel,
  });
};
export const sendMidiOff = (
  midiOut: easymidi.Output,
  params: { note: number; velocity: number; channel: easymidi.Channel }
) => {
  midiOut.send("noteoff", {
    note: params.note,
    velocity: params.velocity,
    channel: params.channel,
  });
};

export const sendMidiCC = (
  midiOut: easymidi.Output,
  params: { cc: number; value: number; channel: easymidi.Channel }
) => {
  console.log("send", params);
  midiOut.send("cc", {
    controller: params.cc,
    value: params.value,
    channel: params.channel,
  });
};

export const mkSendMidiCC14BitTrottled = (
  midiOut: easymidi.Output,
  cc: number,
  channel: easymidi.Channel
) =>
  throttle(
    (value: number) => {
      sendMidiCC(midiOut, { cc, value: Math.floor(value * 127), channel });
      sendMidiCC(midiOut, {
        cc: cc + 32,
        value: (value * 127 - Math.floor(value * 127)) * 127,
        channel,
      });
    },
    20,
    { leading: true, trailing: true }
  );

export const mkSendMidiCC14Bit =
  (midiOut: easymidi.Output, cc: number, channel: easymidi.Channel) =>
  (value: number) => {
    // Low
    sendMidiCC(midiOut, { cc, value: Math.floor(value * 127), channel });
    // High
    sendMidiCC(midiOut, {
      cc: cc + 32,
      value: (value * 127 - Math.floor(value * 127)) * 127,
      channel,
    });

    // Send a second time, VCV Rack doesn't seem to respond to the first message
    // Low
    sendMidiCC(midiOut, { cc, value: Math.floor(value * 127), channel });
    // High
    sendMidiCC(midiOut, {
      cc: cc + 32,
      value: (value * 127 - Math.floor(value * 127)) * 127,
      channel,
    });
  };
