import { buildSupportReceivedPayload } from "../supportCompletion.js"

describe("buildSupportReceivedPayload", () => {
  it("builds notification payload with formatted amount", () => {
    const payload = buildSupportReceivedPayload({
      id: "sup-1",
      supporterName: "Anna",
      amount: 800,
      product: "beer",
      message: "Cheers!",
    })

    expect(payload).toEqual({
      id: "sup-1",
      supporterName: "Anna",
      amount: 800,
      product: "beer",
      message: "Cheers!",
      formattedAmount: expect.stringMatching(/8/),
    })
  })
})
