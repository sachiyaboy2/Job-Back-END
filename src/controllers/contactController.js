/**
 * POST /api/contact
 * Public contact form. Rate limited at the route level.
 */
export async function sendMessage(req, res) {
  const { name, email, message } = req.body;

  console.log(`[contact] Message from ${name} <${email}>`);

  return res.status(201).json({
    success: true,
    message: "Message received",
    data: { message: "Message received", name, email },
  });
}

export default { sendMessage };
