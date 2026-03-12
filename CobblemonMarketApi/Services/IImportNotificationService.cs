namespace CobblemonMarketApi.Services;

public interface IImportNotificationService
{
    Guid Subscribe(Action<string> onMessage);
    void Unsubscribe(Guid subscriptionId);
    void Publish(string message);
}
