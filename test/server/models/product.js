// return User model as a function to sequelize.import()

module.exports = function (sequelize, DataTypes) {
  return sequelize.define('product', {
    name: DataTypes.STRING,
    inventory: DataTypes.INTEGER
  }, {
    scopes: {
      outOfStock: {
        where: {
          inventory: 0
        }
      }
    },
    classMethods: {
      associate: function(db) {
        this.belongsTo(db.productCategory);
        this.belongsToMany(db.tag, {through: 'productTag'});
        this.hasOne(db.private, {as: 'secret'});
      }
    }
  });
};
