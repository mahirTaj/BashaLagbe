import adminRoutes from "./routes/adminRoutes.js";
app.use("/api/admin", adminRoutes);
import propertyRoutes from "./routes/propertyRoutes.js";
app.use("/api/properties", propertyRoutes);