// return User model as a function to sequelize.import()

const associate = function(db) {
  this.hasMany(db.product);
}

module.exports = function (sequelize, DataTypes) {
  return sequelize.define('productCategory', {
      name: DataTypes.STRING,
      rootCategory: DataTypes.BOOLEAN
  }, {
    scopes: {
      roots: {
        where: {
          rootCategory: true
        }
      }
    },
    classMethods: {
      associate: function(db) {
        this.hasMany(db.product);
        this.belongsToMany(db.tag, {through: 'categoryTag'});
      }
    }
  });
};
