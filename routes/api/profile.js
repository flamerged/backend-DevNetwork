const express = require("express");
const router = express.Router();
const request = require("request");
const config = require("config");
const auth = require("../../middleware/auth");
const Profile = require("../../models/Profile");
const User = require("../../models/User");
const { create, populate } = require("../../models/User");
const { check, validationResult } = require("express-validator");

// @route   GET /api/profile/me
// @desc    Get current users profile
// @access  Private
router.get("/me", auth, async (req, res) => {
    try {
        const profile = await Profile.findOne({ user: req.user.id }).populate(
            "user"[("name", "avatar")]
        );

        if (!profile) {
            return res
                .status(400)
                .json({ msg: "There is no profile for this user." });
        }
        res.json(profile);
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
});

// @route   POST /api/profile
// @desc    Create or update user profile
// @access  Private

router.post(
    "/",
    [
        auth,
        [
            check("status", "Status is required").not().isEmpty(),
            check("skills", "Skills are required").not().isEmpty(),
        ],
    ],
    async (req, res) => {
        const errors = validationResult(req);

        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const {
            company,
            website,
            location,
            bio,
            status,
            githubusername,
            skills,
            youtube,
            facebook,
            twitter,
            instagram,
            linkedin,
        } = req.body;

        //Build profile object

        const profileFields = {};
        profileFields.user = req.user.id;
        if (company) profileFields.company = company;
        if (website) profileFields.website = website;
        if (location) profileFields.location = location;
        if (bio) profileFields.bio = bio;
        if (status) profileFields.status = status;
        if (githubusername) profileFields.githubusername = githubusername;
        if (skills) {
            profileFields.skills = skills
                .split(",")
                .map((skill) => skill.trim());
        }

        profileFields.social = {};
        if (youtube) profileFields.social.youtube = youtube;
        if (facebook) profileFields.social.facebook = facebook;
        if (twitter) profileFields.social.twitter = twitter;
        if (instagram) profileFields.social.instagram = instagram;
        if (linkedin) profileFields.social.linkedin = linkedin;

        try {
            const profile = await Profile.findOne({ user: req.user.id });

            if (profile) {
                //update profile
                profile = await Profile.findOneAndUpdate(
                    { user: req.user.id },
                    { $set: profileFields },
                    { new: true }
                );
                return res.status(201).json(profile);
            }

            //create
            profile = new Profile(profileFields);

            await profile.save();
            res.json(profile);
        } catch (err) {
            console.error(err.message);
            res.status(500).send("Server Error");
        }
    }
);

// @route   GET /api/profile
// @desc    Get all Profiles
// @access  Public

router.get("/", async (req, res) => {
    try {
        const profiles = await Profile.find().populate("user", [
            "name",
            "avatar",
        ]);
        res.json(profiles);
    } catch (error) {
        console.error(error.message);
        res.status(500).send("Server Error");
    }
});

// @route   GET /api/profile/user/:user_id
// @desc    Get specific user profile
// @access  Public

router.get("/user/:user_id", async (req, res) => {
    try {
        const profile = await Profile.findOne({
            user: req.params.user_id,
        }).populate("user", ["name", "avatar"]);

        if (!profile) {
            return res.status(400).json({ msg: "Profile not found" });
        }
        res.json(profile);
    } catch (error) {
        console.error(error.message);
        if (error.kind == "ObjectId") {
            return res.status(400).json({ msg: "Profile not found" });
        }
        res.status(500).send("Server Error");
    }
});

// @route   DELETE /api/profile
// @desc    Delete user and profile and posts
// @access  Private

router.delete("/", auth, async (req, res) => {
    try {
        // Remove profile
        await Profile.findOneAndRemove({ user: req.user.id });
        //remove user
        await User.findOneAndRemove({ _id: req.user.id });
        res.json({ msg: "user deleted" });
    } catch (error) {
        console.error(error.message);
        res.status(500).send("Server Error");
    }
});

// @route   PUT /api/profile/experience
// @desc    Add experience to profile
// @access  Private

router.put(
    "/experience",
    [
        auth,
        check("title", "Title is required").not().isEmpty(),
        check("company", "Company is required").not().isEmpty(),
        check("from", "From date is required").not().isEmpty(),
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const {
            title,
            company,
            location,
            from,
            to,
            current,
            description,
        } = req.body;

        const newExp = {
            title,
            company,
            location,
            from,
            to,
            current,
            description,
        };

        try {
            const profile = await Profile.findOne({ user: req.user.id });
            profile.experience.unshift(newExp);
            await profile.save();
            res.json(profile);
        } catch (error) {
            console.error(error.message);
            res.status(500).send("Server Error");
        }
    }
);

// @route   DELETE /api/profile/experience/:exp_id
// @desc    Delete experience from profile
// @access  Private

router.delete("/experience/:exp_id", auth, async (req, res) => {
    try {
        const profile = await Profile.findOne({ user: req.user.id });

        // create new array with the ids of each experience
        // find the index of the id we want to delete

        const indexPosition = profile.experience
            .map((exp) => exp.id)
            .indexOf(req.params.exp_id);

        // delete the experience by using the index to find it's position in the array

        profile.experience.splice(indexPosition, 1);

        await profile.save();
        res.json(profile);
    } catch (error) {
        console.error(error.message);
        res.status(500).send("Server Error");
    }
});

// @TODO Add Route to update individual experience

// @route   PUT /api/profile/education
// @desc    Add education to profile
// @access  Private

router.put(
    "/education",
    [
        auth,
        check("school", "School is required").not().isEmpty(),
        check("degree", "Degree is required").not().isEmpty(),
        check("fieldofstudy", "Field of study is required").not().isEmpty(),
        check("from", "From date is required").not().isEmpty(),
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const {
            school,
            degree,
            fieldofstudy,
            from,
            to,
            current,
            description,
        } = req.body;

        const newEd = {
            school,
            degree,
            fieldofstudy,
            from,
            to,
            current,
            description,
        };

        try {
            const profile = await Profile.findOne({ user: req.user.id });
            profile.education.unshift(newEd);
            await profile.save();
            res.json(profile);
        } catch (error) {
            console.error(error.message);
            res.status(500).send("Server Error");
        }
    }
);

// @route   DELETE /api/profile/education/:ed_id
// @desc    Delete education from profile
// @access  Private

router.delete("/education/:ed_id", auth, async (req, res) => {
    try {
        const profile = await Profile.findOne({ user: req.user.id });

        // create new array with the ids of each experience
        // find the index of the id we want to delete

        const indexPosition = profile.education
            .map((ed) => ed.id)
            .indexOf(req.params.ed_id);

        // delete the experience by using the index to find it's position in the array

        profile.education.splice(indexPosition, 1);

        await profile.save();
        res.json(profile);
    } catch (error) {
        console.error(error.message);
        res.status(500).send("Server Error");
    }
});

// @route   GET /api/profile/github/:username
// @desc    Get user repos from Github
// @access  Public

router.get("/github/:username", (req, res) => {
    try {
        const options = {
            uri: `https://api.github.com/users/${
                req.params.username
            }/repos?per_page=5&sort=created:asc&client_id=${config.get(
                "githubClientId"
            )}&client_secret=${config.get("githubSecret")}`,
            method: "GET",
            headers: { "user-agent": "node.js" },
        };

        request(options, (error, response, body) => {
            if (error) {
                console.error(error);
            }
            if (response.statusCode !== 200) {
                return res.status(404).json({ msg: "No Github profile found" });
            }

            res.json(JSON.parse(body));
        });
    } catch (error) {
        console.error(error.message);
        res.status(500).send("Server Error");
    }
});

module.exports = router;
