// return User model as a function to sequelize.import()

module.exports = function (sequelize, DataTypes) {
  return sequelize.define('tag', {
    name: DataTypes.STRING
  }, {
    classMethods: {
      associate: function(db) {
        this.belongsToMany(db.product, {through: 'productTag'});
        this.belongsToMany(db.productCategory, {through: 'categoryTag'});
      }
    }
  });;
};
