const express = require('express')
const app = express()
const cookieParser = require('cookie-parser')
const jwt = require('jsonwebtoken')
const bcrypt = require('bcrypt')
const path = require('path')
const upload = require('./config/multer-config.js')
const mongoose = require('mongoose')

const compression = require('compression')
require('dotenv').config();

//defining all the models 
const userModel = require('./models/usermodel.js')
const swaprequestModel = require('./models/swaprequestmodel.js')
const ratingsModel = require('./models/ratingsmodel.js')
const adminNotificationModel = require('./models/adminnotificationmodel.js')

app.set("view engine", "ejs")
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(express.static(path.join(__dirname, 'public')))
app.use(cookieParser())
app.use(compression());

//middleware functions 
function isloggedin(req, res, next) {
    const token = req.cookies.token;

    if (!token) {
        return res.redirect('/login');
    }

    try {
        const data = jwt.verify(token, process.env.MYSECRETKEY);
        req.user = data; // attaches { email, userid, iat, exp }
        next();
    } catch (err) {
        console.error("JWT verification failed:", err);
        res.redirect('/login');
    }
}

function isAdmin(req, res, next) {
    const token = req.cookies.token;

    if (!token) {
        return res.redirect('/login');
    }

    try {
        const data = jwt.verify(token, process.env.MYSECRETKEY);
        req.user = data;
        
        // Check if user is admin
        userModel.findById(data.userid).then(user => {
            if (!user || !user.isAdmin) {
                return res.render('oops', { message: "Access denied. Admin privileges required." });
            }
            next();
        }).catch(err => {
            console.error("Admin check error:", err);
            res.render('oops', { message: "Access denied. Admin privileges required." });
        });
    } catch (err) {
        console.error("JWT verification failed:", err);
        res.redirect('/login');
    }
}

// Store redirect URL for after login
app.use((req, res, next) => {
    if (req.method === 'GET' && req.path !== '/login' && req.path !== '/register' && req.path !== '/') {
        req.redirectUrl = req.originalUrl;
    }
    next();
});

// Routes
app.get('/', async (req, res) => {
    try {
        // Get all public users or all users if logged in
        let users;
        if (req.cookies.token) {
            try {
                const data = jwt.verify(req.cookies.token, process.env.MYSECRETKEY);
                users = await userModel.find({ 
                    _id: { $ne: data.userid },
                    $or: [
                        { isPrivate: false },
                        { _id: data.userid }
                    ]
                }).select('name email location profilePhoto availability isPrivate');
            } catch (err) {
                users = await userModel.find({ isPrivate: false }).select('name email location profilePhoto availability isPrivate');
            }
        } else {
            users = await userModel.find({ isPrivate: false }).select('name email location profilePhoto availability isPrivate');
        }

        // Calculate average ratings for each user
        for (let user of users) {
            const ratings = await ratingsModel.find({
                $or: [
                    { fromUserId: user._id },
                    { toUserId: user._id }
                ]
            });

            if (ratings.length > 0) {
                const totalRating = ratings.reduce((sum, rating) => sum + rating.rating, 0);
                user.averageRating = totalRating / ratings.length;
            } else {
                user.averageRating = null;
            }
        }
        
        res.render('home', { users, isLoggedIn: !!req.cookies.token });
    } catch (error) {
        console.error('Error fetching users:', error);
        res.render('home', { users: [], isLoggedIn: !!req.cookies.token });
    }
});

app.get('/login', (req, res) => {
    if (req.cookies.token) {
        return res.redirect('/');
    }
    res.render('login', { redirectUrl: req.query.redirect || '/' });
});

app.get('/register', (req, res) => {
    if (req.cookies.token) {
        return res.redirect('/');
    }
    res.render('register', { redirectUrl: req.query.redirect || '/' });
});

app.post('/login', async (req, res) => {
    try {
        let { email, password, redirectUrl } = req.body;
        
        let user = await userModel.findOne({ email });
        if (!user) {
            return res.render('login', { error: "Email not found", redirectUrl });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.render('login', { error: "Invalid password", redirectUrl });
        }

        // Check if user is banned
        if (user.isBanned) {
            return res.render('login', { error: "Account has been suspended. Contact administrator.", redirectUrl });
        }

        // Update login count and last login
        await userModel.findByIdAndUpdate(user._id, {
            lastLogin: new Date(),
            loginCount: (user.loginCount || 0) + 1
        });

        const token = jwt.sign({ email: email, userid: user._id }, process.env.MYSECRETKEY, { expiresIn: "24h" });
        res.cookie("token", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax"
        });

        res.redirect(redirectUrl || '/');
    } catch (error) {
        console.error('Login error:', error);
        res.render('login', { error: "Something went wrong", redirectUrl: req.body.redirectUrl });
    }
});

app.post('/register', async (req, res) => {
    try {
        let { name, email, password, location, availability, skillsOffered, skillsWanted, redirectUrl } = req.body;

        let checkuser = await userModel.findOne({ email });
        if (checkuser) {
            return res.render('register', { error: "Email already exists", redirectUrl });
        }

        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(password, salt);
        
        let user = await userModel.create({
            name,
            email,
            password: hash,
            location,
            availability,
            skillsOffered: skillsOffered ? (Array.isArray(skillsOffered) ? skillsOffered : [skillsOffered]).filter(s => s) : [],
            skillsWanted: skillsWanted ? (Array.isArray(skillsWanted) ? skillsWanted : [skillsWanted]).filter(s => s) : []
        });

        const token = jwt.sign({ email: email, userid: user._id }, process.env.MYSECRETKEY, { expiresIn: "24h" });
        res.cookie("token", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax"
        });

        res.redirect(redirectUrl || '/');
    } catch (error) {
        console.error('Registration error:', error);
        res.render('register', { error: "Something went wrong", redirectUrl: req.body.redirectUrl });
    }
});

app.get('/logout', (req, res) => {
    res.clearCookie('token');
    res.redirect('/');
});

// Profile routes
app.get('/profile', isloggedin, async (req, res) => {
    try {
        const user = await userModel.findById(req.user.userid);
        if (!user) {
            return res.redirect('/login');
        }
        res.render('userprofile', { user });
    } catch (error) {
        console.error('Profile error:', error);
        res.redirect('/login');
    }
});

app.get('/profile/:userId', async (req, res) => {
    try {
        const user = await userModel.findById(req.params.userId);
        if (!user) {
            return res.render('oops', { message: "User not found" });
        }

        // Check if profile is private and user is not the owner
        if (user.isPrivate) {
            const token = req.cookies.token;
            if (!token) {
                return res.render('oops', { message: "This profile is private" });
            }
            
            try {
                const data = jwt.verify(token, process.env.MYSECRETKEY);
                if (data.userid !== req.params.userId) {
                    return res.render('oops', { message: "This profile is private" });
                }
            } catch (err) {
                return res.render('oops', { message: "This profile is private" });
            }
        }

        // Calculate average rating for the user
        const ratings = await ratingsModel.find({
            $or: [
                { fromUserId: user._id },
                { toUserId: user._id }
            ]
        });

        if (ratings.length > 0) {
            const totalRating = ratings.reduce((sum, rating) => sum + rating.rating, 0);
            user.averageRating = totalRating / ratings.length;
        } else {
            user.averageRating = null;
        }

        res.render('userprofile', { user, isOwnProfile: req.cookies.token ? jwt.verify(req.cookies.token, process.env.MYSECRETKEY).userid === req.params.userId : false });
    } catch (error) {
        console.error('Profile view error:', error);
        res.render('oops', { message: "User not found" });
    }
});

app.get('/profile/edit', isloggedin, async (req, res) => {
    try {
        const user = await userModel.findById(req.user.userid);
        if (!user) {
            return res.redirect('/login');
        }
        res.render('editprofile', { user });
    } catch (error) {
        console.error('Edit profile error:', error);
        res.redirect('/login');
    }
});

app.post('/profile/edit', isloggedin, upload.single('profilePhoto'), async (req, res) => {
    try {
        const { name, location, availability, isPrivate, offeredSkills, wantedSkills } = req.body;
        const updateData = { 
            name, 
            location, 
            availability, 
            isPrivate: isPrivate === 'on',
            skillsOffered: offeredSkills ? (Array.isArray(offeredSkills) ? offeredSkills : [offeredSkills]).filter(s => s) : [],
            skillsWanted: wantedSkills ? (Array.isArray(wantedSkills) ? wantedSkills : [wantedSkills]).filter(s => s) : []
        };

        if (req.file) {
            // Store the local file path instead of cloudinary URL
            updateData.profilePhoto = `/images/uploadedimage/${req.file.filename}`;
        }

        await userModel.findByIdAndUpdate(req.user.userid, updateData);
        res.redirect('/profile');
    } catch (error) {
        console.error('Profile update error:', error);
        res.render('editprofile', { user: await userModel.findById(req.user.userid), error: "Failed to update profile" });
    }
});

// Skill swap request routes
app.get('/request/:userId', isloggedin, async (req, res) => {
    try {
        // Prevent self-swap
        if (req.params.userId === req.user.userid) {
            return res.render('oops', { message: "You cannot swap skills with yourself!" });
        }

        const targetUser = await userModel.findById(req.params.userId);
        if (!targetUser) {
            return res.render('oops', { message: "User not found" });
        }

        const currentUser = await userModel.findById(req.user.userid);
        res.render('request', { targetUser, currentUser });
    } catch (error) {
        console.error('Request page error:', error);
        res.render('oops', { message: "Something went wrong" });
    }
});

app.post('/request/:userId', isloggedin, async (req, res) => {
    try {
        // Prevent self-swap
        if (req.params.userId === req.user.userid) {
            return res.render('oops', { message: "You cannot swap skills with yourself!" });
        }

        const { skillsOffered, skillsWanted } = req.body;
        
        // Create swap request
        await swaprequestModel.create({
            fromUserId: req.user.userid,
            toUserId: req.params.userId,
            skillsOffered: skillsOffered.split(',').map(s => s.trim()),
            skillsWanted: skillsWanted.split(',').map(s => s.trim())
        });

        res.redirect('/notifications');
    } catch (error) {
        console.error('Request creation error:', error);
        res.render('oops', { message: "Failed to create request" });
    }
});

// Notifications
app.get('/notifications', isloggedin, async (req, res) => {
    try {
        const receivedRequests = await swaprequestModel.find({ 
            toUserId: req.user.userid,
            status: 'pending'
        }).populate('fromUserId', 'name email');

        const sentRequests = await swaprequestModel.find({ 
            fromUserId: req.user.userid
        }).populate('toUserId', 'name email');

        res.render('notifications', { receivedRequests, sentRequests });
    } catch (error) {
        console.error('Notifications error:', error);
        res.render('oops', { message: "Failed to load notifications" });
    }
});

app.post('/notifications/accept/:requestId', isloggedin, async (req, res) => {
    try {
        await swaprequestModel.findByIdAndUpdate(req.params.requestId, { status: 'accepted' });
        res.redirect('/notifications');
    } catch (error) {
        console.error('Accept request error:', error);
        res.render('oops', { message: "Failed to accept request" });
    }
});

app.post('/notifications/reject/:requestId', isloggedin, async (req, res) => {
    try {
        await swaprequestModel.findByIdAndUpdate(req.params.requestId, { status: 'rejected' });
        res.redirect('/notifications');
    } catch (error) {
        console.error('Reject request error:', error);
        res.render('oops', { message: "Failed to reject request" });
    }
});

// Rating system routes
app.post('/notifications/rate/:requestId', isloggedin, async (req, res) => {
    try {
        const { rating, feedback } = req.body;
        const request = await swaprequestModel.findById(req.params.requestId);
        
        if (!request) {
            return res.render('oops', { message: "Request not found" });
        }

        // Check if user is part of this request
        if (request.fromUserId.toString() !== req.user.userid && request.toUserId.toString() !== req.user.userid) {
            return res.render('oops', { message: "You can only rate requests you're involved in" });
        }

        // Create or update rating
        const ratingData = {
            swapRequestId: req.params.requestId,
            fromUserId: request.fromUserId,
            toUserId: request.toUserId,
            rating: parseInt(rating),
            feedback: feedback || ""
        };

        await ratingsModel.findOneAndUpdate(
            { swapRequestId: req.params.requestId },
            ratingData,
            { upsert: true, new: true }
        );

        res.redirect('/notifications');
    } catch (error) {
        console.error('Rating error:', error);
        res.render('oops', { message: "Failed to submit rating" });
    }
});

// ==================== ADMIN PANEL ROUTES ====================

// Admin Dashboard
app.get('/admin', isAdmin, async (req, res) => {
    try {
        const totalUsers = await userModel.countDocuments();
        const activeUsers = await userModel.countDocuments({ isBanned: false });
        const bannedUsers = await userModel.countDocuments({ isBanned: true });
        const totalRequests = await swaprequestModel.countDocuments();
        const pendingRequests = await swaprequestModel.countDocuments({ status: 'pending' });
        const acceptedRequests = await swaprequestModel.countDocuments({ status: 'accepted' });
        const recentUsers = await userModel.find().sort({ createdAt: -1 }).limit(5);
        const recentRequests = await swaprequestModel.find().populate('fromUserId toUserId', 'name email').sort({ createdAt: -1 }).limit(5);

        res.render('admin_dashboard', {
            totalUsers,
            activeUsers,
            bannedUsers,
            totalRequests,
            pendingRequests,
            acceptedRequests,
            recentUsers,
            recentRequests
        });
    } catch (error) {
        console.error('Admin dashboard error:', error);
        res.render('oops', { message: "Failed to load admin dashboard" });
    }
});

// User Management
app.get('/admin/users', isAdmin, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 20;
        const skip = (page - 1) * limit;
        
        const users = await userModel.find()
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);
        
        const totalUsers = await userModel.countDocuments();
        const totalPages = Math.ceil(totalUsers / limit);

        res.render('admin_users', { users, currentPage: page, totalPages });
    } catch (error) {
        console.error('Admin users error:', error);
        res.render('oops', { message: "Failed to load users" });
    }
});

// Ban/Unban User
app.post('/admin/users/:userId/ban', isAdmin, async (req, res) => {
    try {
        const { reason } = req.body;
        await userModel.findByIdAndUpdate(req.params.userId, {
            isBanned: true,
            banReason: reason || 'Violation of terms of service'
        });
        res.redirect('/admin/users');
    } catch (error) {
        console.error('Ban user error:', error);
        res.render('oops', { message: "Failed to ban user" });
    }
});

app.post('/admin/users/:userId/unban', isAdmin, async (req, res) => {
    try {
        await userModel.findByIdAndUpdate(req.params.userId, {
            isBanned: false,
            banReason: null
        });
        res.redirect('/admin/users');
    } catch (error) {
        console.error('Unban user error:', error);
        res.render('oops', { message: "Failed to unban user" });
    }
});

// Make User Admin
app.post('/admin/users/:userId/make-admin', isAdmin, async (req, res) => {
    try {
        await userModel.findByIdAndUpdate(req.params.userId, { isAdmin: true });
        res.redirect('/admin/users');
    } catch (error) {
        console.error('Make admin error:', error);
        res.render('oops', { message: "Failed to make user admin" });
    }
});

// Remove Admin Privileges
app.post('/admin/users/:userId/remove-admin', isAdmin, async (req, res) => {
    try {
        await userModel.findByIdAndUpdate(req.params.userId, { isAdmin: false });
        res.redirect('/admin/users');
    } catch (error) {
        console.error('Remove admin error:', error);
        res.render('oops', { message: "Failed to remove admin privileges" });
    }
});

// Swap Requests Management
app.get('/admin/requests', isAdmin, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 20;
        const skip = (page - 1) * limit;
        
        const requests = await swaprequestModel.find()
            .populate('fromUserId toUserId', 'name email')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);
        
        const totalRequests = await swaprequestModel.countDocuments();
        const totalPages = Math.ceil(totalRequests / limit);

        res.render('admin_requests', { requests, currentPage: page, totalPages });
    } catch (error) {
        console.error('Admin requests error:', error);
        res.render('oops', { message: "Failed to load requests" });
    }
});

// Delete Swap Request
app.post('/admin/requests/:requestId/delete', isAdmin, async (req, res) => {
    try {
        await swaprequestModel.findByIdAndDelete(req.params.requestId);
        res.redirect('/admin/requests');
    } catch (error) {
        console.error('Delete request error:', error);
        res.render('oops', { message: "Failed to delete request" });
    }
});

// Notifications Management
app.get('/admin/notifications', isAdmin, async (req, res) => {
    try {
        const notifications = await adminNotificationModel.find().sort({ createdAt: -1 });
        res.render('admin_notifications', { notifications });
    } catch (error) {
        console.error('Admin notifications error:', error);
        res.render('oops', { message: "Failed to load notifications" });
    }
});

app.post('/admin/notifications/create', isAdmin, async (req, res) => {
    try {
        const { title, message, type, targetUsers, specificUserIds } = req.body;
        
        const notificationData = {
            title,
            message,
            type,
            targetUsers
        };

        if (targetUsers === 'specific' && specificUserIds) {
            notificationData.specificUserIds = specificUserIds.split(',').map(id => id.trim());
        }

        await adminNotificationModel.create(notificationData);
        res.redirect('/admin/notifications');
    } catch (error) {
        console.error('Create notification error:', error);
        res.render('oops', { message: "Failed to create notification" });
    }
});

app.post('/admin/notifications/:notificationId/delete', isAdmin, async (req, res) => {
    try {
        await adminNotificationModel.findByIdAndDelete(req.params.notificationId);
        res.redirect('/admin/notifications');
    } catch (error) {
        console.error('Delete notification error:', error);
        res.render('oops', { message: "Failed to delete notification" });
    }
});

// Analytics and Reports
app.get('/admin/analytics', isAdmin, async (req, res) => {
    try {
        // User statistics
        const totalUsers = await userModel.countDocuments();
        const activeUsers = await userModel.countDocuments({ isBanned: false });
        const bannedUsers = await userModel.countDocuments({ isBanned: true });
        const adminUsers = await userModel.countDocuments({ isAdmin: true });

        // Request statistics
        const totalRequests = await swaprequestModel.countDocuments();
        const pendingRequests = await swaprequestModel.countDocuments({ status: 'pending' });
        const acceptedRequests = await swaprequestModel.countDocuments({ status: 'accepted' });
        const rejectedRequests = await swaprequestModel.countDocuments({ status: 'rejected' });

        // Recent activity
        const recentUsers = await userModel.find().sort({ createdAt: -1 }).limit(10);
        const recentRequests = await swaprequestModel.find().populate('fromUserId toUserId', 'name email').sort({ createdAt: -1 }).limit(10);

        // Monthly statistics
        const currentMonth = new Date();
        currentMonth.setDate(1);
        const newUsersThisMonth = await userModel.countDocuments({ createdAt: { $gte: currentMonth } });
        const requestsThisMonth = await swaprequestModel.countDocuments({ createdAt: { $gte: currentMonth } });

        res.render('admin_analytics', {
            totalUsers,
            activeUsers,
            bannedUsers,
            adminUsers,
            totalRequests,
            pendingRequests,
            acceptedRequests,
            rejectedRequests,
            recentUsers,
            recentRequests,
            newUsersThisMonth,
            requestsThisMonth
        });
    } catch (error) {
        console.error('Analytics error:', error);
        res.render('oops', { message: "Failed to load analytics" });
    }
});

// Download Records
app.get('/admin/download/users', isAdmin, async (req, res) => {
    try {
        const users = await userModel.find().select('-password');
        
        let csv = 'ID,Name,Email,Location,Availability,Skills Offered,Skills Wanted,Is Private,Is Banned,Is Admin,Login Count,Last Login,Created At\n';
        
        users.forEach(user => {
            csv += `"${user._id}","${user.name || ''}","${user.email}","${user.location || ''}","${user.availability || ''}","${user.skillsOffered.join(', ')}","${user.skillsWanted.join(', ')}","${user.isPrivate}","${user.isBanned}","${user.isAdmin}","${user.loginCount || 0}","${user.lastLogin}","${user.createdAt}"\n`;
        });

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=users.csv');
        res.send(csv);
    } catch (error) {
        console.error('Download users error:', error);
        res.render('oops', { message: "Failed to download users" });
    }
});

app.get('/admin/download/requests', isAdmin, async (req, res) => {
    try {
        const requests = await swaprequestModel.find().populate('fromUserId toUserId', 'name email');
        
        let csv = 'ID,From User,To User,Skills Offered,Skills Wanted,Status,Created At\n';
        
        requests.forEach(request => {
            csv += `"${request._id}","${request.fromUserId.name}","${request.toUserId.name}","${request.skillsOffered.join(', ')}","${request.skillsWanted.join(', ')}","${request.status}","${request.createdAt}"\n`;
        });

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=swap_requests.csv');
        res.send(csv);
    } catch (error) {
        console.error('Download requests error:', error);
        res.render('oops', { message: "Failed to download requests" });
    }
});

// Error handling
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).render('oops', { message: "Something went wrong" });
});

app.listen(3000, () => {
    console.log('Server running on port 3000');
});