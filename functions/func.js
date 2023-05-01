const initUserApi = async (req, client) => {
    try {
        let user;
        user =  await client.userApi.getUser({ userId: req.userContext.userinfo.sub });
        return user;
    } catch (error) {
        console.log(error);
    }
}

const updateUserAttr = async (req, client, user) => {
    try {
        const data = Object.entries(req.body)
        .filter(([attr, value]) => value !== '')
        console.log(data);
        for (const [attr, value] of data){
                user.profile[attr] = value;
                await client.userApi.updateUser({
                userId: user.id,
                user: user
                });
        }
    } catch (error) {
        console.log(error);
    }
}

module.exports = { initUserApi, updateUserAttr};
