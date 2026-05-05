module.exports = async (req, res) => {
  try {
    const mod = await import("../apps/api/src/index.js");
    const app = mod.default;
    return app(req, res);
  } catch (error) {
    console.error("API bootstrap failure:", error);
    return res.status(500).json({
      error: "API bootstrap failure",
      message: error?.message || "Unknown error"
    });
  }
};
